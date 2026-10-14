package Plugin;

import java.awt.Desktop;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NoRouteToHostException;
import java.net.Proxy;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class Siwc {

    private interface Net<T> { T run(Proxy p) throws IOException; }

    private static final class Bad extends IOException {
        final int code;
        Bad(int code, String m) { super(m); this.code = code; }
    }

    private static final String ISS = System.getProperty("siwc.issuer", "https://auth.openai.com"), API = System.getProperty("siwc.api", "https://api.openai.com/v1"),
        RES = "https://api.openai.com/v1", SHARE = "chatgpt.tokens.use.direct", SCOPES = "openid profile email offline_access resource.invoke " + SHARE,
        J = "application/json", SIGN_IN = "Sign in with ChatGPT in AI settings first.", NOT = "minisvg-bridge-not-a-proxy";
    private static final SecureRandom RND = new SecureRandom();
    private static Siwc on;
    private final ServerSocket ss;
    private final String key = rnd(), app;
    private final Path file;
    private final Map<String, String> t = new LinkedHashMap<>();
    private Map<String, String> disc;
    private String state, nonce, verifier, redirect, err, auto = "";
    private volatile String note, ptest;
    private long autoAt, mt = -1;

    static synchronized void start(File dir) throws IOException {
        if (on == null) on = new Siwc(dir.getName());
        Files.write(new File(dir, "siwc-session.js").toPath(), ("window.TBSIWC={url:'http://127.0.0.1:" + on.ss.getLocalPort() + "',key:'" + on.key + "'};\n").getBytes(StandardCharsets.UTF_8));
    }

    private Siwc(String app) throws IOException {
        this.app = app;
        file = new File(System.getProperty("user.home"), ".tbtools-siwc").toPath().resolve(app.replaceAll("[^\\w.-]", "_") + ".json");
        sync();
        ss = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        daemon(() -> {
            while (!ss.isClosed()) try {
                Socket s = ss.accept();
                daemon(() -> serve(s));
            } catch (IOException e) {
            }
        });
    }

    private synchronized void sync() {
        try {
            long m = Files.getLastModifiedTime(file).toMillis();
            if (m == mt) return;
            Matcher x = Pattern.compile("\"(\\w+)\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").matcher(new String(Files.readAllBytes(file), StandardCharsets.UTF_8));
            t.clear();
            while (x.find()) t.put(x.group(1), unq(x.group(2)));
            mt = m;
        } catch (IOException e) {
            if (mt != -1) t.clear();
            mt = -1;
        }
    }

    private static void daemon(Runnable r) {
        Thread th = new Thread(r, "siwc");
        th.setDaemon(true);
        th.start();
    }

    private void serve(Socket s) {
        try (Socket c = s) {
            c.setSoTimeout(30000);
            InputStream in = new BufferedInputStream(c.getInputStream());
            String[] rl = line(in).split(" ");
            Map<String, String> h = new LinkedHashMap<>();
            for (String l; !(l = line(in)).isEmpty(); ) {
                int i = l.indexOf(':');
                if (i > 0) h.put(l.substring(0, i).trim().toLowerCase(Locale.ROOT), l.substring(i + 1).trim());
            }
            int n = Integer.parseInt(h.getOrDefault("content-length", "0"));
            if (rl.length < 2 || n < 0 || n > 64 << 20) return;
            byte[] body = in.readNBytes(n);
            c.setSoTimeout(0);
            OutputStream out = c.getOutputStream();
            if (rl[0].equals("CONNECT") || !rl[1].startsWith("/")) {
                out.write(("HTTP/1.1 403 " + NOT + "\r\nConnection: close\r\nContent-Length: 0\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1));
                return;
            }
            URI u = new URI(rl[1]);
            String p = u.getPath();
            if (!("127.0.0.1:" + ss.getLocalPort()).equals(h.get("host"))) send(out, 403, J, fail("Forbidden"));
            else if (rl[0].equals("OPTIONS")) send(out, 204, null, null);
            else if (p.equals("/auth/callback")) send(out, 200, "text/html; charset=utf-8", page(callback(query(u.getRawQuery()))));
            else if (!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8), h.getOrDefault("x-siwc-key", "").getBytes(StandardCharsets.UTF_8))) send(out, 401, J, fail("Forbidden"));
            else try {
                switch (p) {
                    case "/siwc/status": send(out, 200, J, status()); break;
                    case "/siwc/login": send(out, 200, J, login()); break;
                    case "/siwc/logout": logout(); send(out, 200, J, status()); break;
                    case "/siwc/proxy": proxy(new String(body, StandardCharsets.UTF_8).trim()); ptest = probe(); send(out, 200, J, status()); break;
                    case "/siwc/models": relay(out, "/models", null); break;
                    case "/siwc/responses": relay(out, "/responses", body); break;
                    default: send(out, 404, J, fail("Not found"));
                }
            } catch (Bad e) {
                send(out, e.code, J, fail(e.getMessage()));
            } catch (Exception e) {
                send(out, 502, J, fail(e.getMessage() == null ? e.toString() : e.getMessage()));
            }
        } catch (Exception e) {
        }
    }

    private static String line(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        for (int c; (c = in.read()) >= 0 && c != '\n'; ) if (c != '\r' && b.size() < 16384) b.write(c);
        return b.toString(StandardCharsets.ISO_8859_1);
    }

    private static void send(OutputStream out, int code, String type, String body) throws IOException {
        byte[] b = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
        out.write(head(code, type, b.length));
        out.write(b);
        out.flush();
    }

    private static byte[] head(int code, String type, int n) {
        return ("HTTP/1.1 " + code + (code < 400 ? " OK" : " Error") + "\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            + "Access-Control-Allow-Headers: content-type, x-siwc-key\r\nAccess-Control-Allow-Private-Network: true\r\nAccess-Control-Max-Age: 600\r\n"
            + "Cache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nConnection: close\r\n" + (type == null ? "" : "Content-Type: " + type + "\r\n")
            + (n < 0 ? "" : "Content-Length: " + n + "\r\n") + "\r\n").getBytes(StandardCharsets.ISO_8859_1);
    }

    private synchronized String status() {
        sync();
        boolean in = t.containsKey("access");
        return "{\"signedIn\":" + in + ",\"share\":" + (in && share()) + ",\"email\":" + q(t.get("email")) + ",\"name\":" + q(t.get("name"))
            + ",\"waiting\":" + (state != null) + ",\"error\":" + q(err) + ",\"proxy\":" + q(t.getOrDefault("proxy", "")) + ",\"auto\":" + q(detect())
            + ",\"note\":" + q(note) + ",\"ptest\":" + q(ptest) + "}";
    }

    private synchronized String login() throws Exception {
        sync();
        Map<String, String> d = disc();
        state = rnd();
        nonce = rnd();
        verifier = rnd();
        err = null;
        redirect = "http://127.0.0.1:" + ss.getLocalPort() + "/auth/callback";
        String cid = t.get("client");
        StringBuilder u = new StringBuilder(d.get("authorization_endpoint")).append('?').append(form("client_id", cid == null ? "dynamic_agent_client" : cid, "response_type", "code",
            "redirect_uri", redirect, "scope", SCOPES, "resource", RES, "state", state, "nonce", nonce, "code_challenge_method", "S256",
            "code_challenge", Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)))));
        if (cid == null) u.append('&').append(form("agent_name_hint", app));
        if (!t.getOrDefault("hint", "").isEmpty()) u.append('&').append(form("login_hint", t.get("hint")));
        return "{\"url\":" + q(u.toString()) + ",\"opened\":" + browse(u.toString()) + "}";
    }

    private synchronized String callback(Map<String, String> p) {
        if (state == null || !state.equals(p.get("state"))) return "This sign-in link is out of date. Start again from TBtools.";
        state = null;
        sync();
        if (p.get("error") != null) return "Sign-in did not finish: " + (err = p.getOrDefault("error_description", p.get("error")));
        String code = p.get("code"), cid = p.getOrDefault("client_id", t.get("client"));
        if (code == null || cid == null || !cid.matches("[\\w-]{1,200}") || cid.equals("dynamic_agent_client")) return err = "ChatGPT did not complete the app registration. Try again.";
        t.put("client", cid);
        try {
            save();
            String j = post(disc().get("token_endpoint"), form("grant_type", "authorization_code", "client_id", cid, "code", code, "code_verifier", verifier, "redirect_uri", redirect, "resource", RES)),
                id = str(j, "id_token"), c = id == null || id.split("\\.").length < 2 ? null : new String(Base64.getUrlDecoder().decode(id.split("\\.")[1]), StandardCharsets.UTF_8);
            if (c == null || !nonce.equals(str(c, "nonce")) || str(c, "sub") == null) throw new IOException("ChatGPT returned an identity that could not be verified.");
            tokens(j);
            for (String k : new String[]{"email", "name"}) if (str(c, k) != null) t.put(k, str(c, k));
            t.put("hint", t.getOrDefault("email", ""));
            save();
            String who = t.getOrDefault("email", "your ChatGPT account");
            return share() ? "Signed in as " + who + ". You can close this tab and go back to TBtools."
                : "Signed in as " + who + ", but this account did not allow apps to use its ChatGPT plan, so drawing won't work. Turn plan usage on in ChatGPT settings and sign in again.";
        } catch (Exception e) {
            return "Sign-in failed: " + (err = e.getMessage());
        }
    }

    private synchronized void logout() {
        sync();
        String r = t.get("refresh");
        if (r != null) try {
            String re = disc().get("revocation_endpoint");
            if (re != null) post(re, form("token", r, "token_type_hint", "refresh_token", "client_id", t.get("client")));
        } catch (Exception e) {
        }
        for (String k : new String[]{"access", "refresh", "exp", "earliest", "scope", "email", "name"}) t.remove(k);
        err = null;
        state = null;
        save();
    }

    private synchronized void proxy(String s) throws Bad {
        sync();
        Proxy p = parse(s);
        if (!s.isEmpty() && p == null) throw new Bad(400, "Write the proxy as host:port, e.g. 127.0.0.1:7890, or socks://127.0.0.1:7891.");
        if (p != null && ((InetSocketAddress) p.address()).getPort() == ss.getLocalPort() && ((InetSocketAddress) p.address()).getAddress() != null && ((InetSocketAddress) p.address()).getAddress().isLoopbackAddress())
            throw new Bad(400, "That is minisvg's own ChatGPT bridge, not a proxy.");
        t.put("proxy", s);
        note = null;
        autoAt = 0;
        save();
    }

    private synchronized String access(boolean force) throws IOException {
        sync();
        if (t.get("access") == null) throw new Bad(401, SIGN_IN);
        if (!share()) throw new Bad(403, "This ChatGPT account did not allow apps to use its plan. Turn plan usage on in ChatGPT settings, then sign in again.");
        long now = System.currentTimeMillis(), exp = num("exp"), early = num("earliest");
        if (!force && (exp - 60000 > now || early > now && exp > now)) return t.get("access");
        if (t.get("refresh") == null) {
            logout();
            throw new Bad(401, "Your ChatGPT sign-in has expired. " + SIGN_IN);
        }
        String r = t.get("refresh");
        try {
            tokens(post(disc().get("token_endpoint"), form("grant_type", "refresh_token", "client_id", t.get("client"), "refresh_token", r, "resource", RES)));
            save();
        } catch (Bad e) {
            if (e.code >= 400 && e.code < 500) {
                mt = -2;
                sync();
                if (t.get("access") != null && !r.equals(t.get("refresh")) && num("exp") - 60000 > System.currentTimeMillis()) return t.get("access");
                if (num("earliest") > System.currentTimeMillis()) throw new Bad(503, "Your ChatGPT connection can't be renewed yet. Try again in a moment.");
                logout();
                throw new Bad(401, "Your ChatGPT sign-in has expired (" + e.getMessage() + "). " + SIGN_IN);
            }
            throw e;
        }
        return t.get("access");
    }

    private void tokens(String j) throws IOException {
        String a = str(j, "access_token"), e = str(j, "expires_in"), r = str(j, "refresh_token"), s = str(j, "scope"), w = str(j, "earliest_refresh_at");
        if (a == null || e == null) throw new IOException("ChatGPT returned incomplete credentials.");
        t.put("access", a);
        t.put("exp", String.valueOf(System.currentTimeMillis() + (long) (Double.parseDouble(e) * 1000)));
        if (r != null) t.put("refresh", r);
        if (s != null) t.put("scope", s);
        long ms = 0;
        if (w != null) try {
            ms = w.matches("[\\d.]+") ? (long) (Double.parseDouble(w) * 1000) : Instant.parse(w).toEpochMilli();
        } catch (Exception x) {
        }
        t.put("earliest", String.valueOf(ms));
    }

    private void relay(OutputStream out, String path, byte[] body) throws Exception {
        HttpURLConnection c = null;
        for (int i = 0; i < 2; i++) {
            String a = access(i > 0);
            c = net(p -> {
                HttpURLConnection x = open(API + path, p);
                x.setReadTimeout(600000);
                x.setRequestMethod(body == null ? "GET" : "POST");
                x.setRequestProperty("Authorization", "Bearer " + a);
                x.setRequestProperty("Accept", body == null ? J : "text/event-stream");
                if (body != null) {
                    x.setDoOutput(true);
                    x.setRequestProperty("Content-Type", J);
                    x.setFixedLengthStreamingMode(body.length);
                    try (OutputStream o = x.getOutputStream()) { o.write(body); }
                }
                x.getResponseCode();
                return x;
            });
            if (c.getResponseCode() != 401 || i > 0) break;
            c.disconnect();
        }
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        out.write(head(code, c.getContentType() == null ? (body == null ? J : "text/event-stream") : c.getContentType(), -1));
        out.flush();
        if (in != null) try (InputStream i = in) {
            byte[] b = new byte[8192];
            for (int n; (n = i.read(b)) > 0; ) {
                out.write(b, 0, n);
                out.flush();
            }
        } catch (IOException e) {
        }
    }

    private synchronized Map<String, String> disc() throws IOException {
        if (disc != null) return disc;
        String j = net(p -> {
            HttpURLConnection c = open(ISS + "/.well-known/openid-configuration", p);
            String r = read(c);
            if (c.getResponseCode() != 200 || !ISS.equals(str(r, "issuer"))) throw new IOException("ChatGPT sign-in is not reachable (" + c.getResponseCode() + ").");
            return r;
        });
        Map<String, String> d = new LinkedHashMap<>();
        for (String k : new String[]{"authorization_endpoint", "token_endpoint", "revocation_endpoint"}) {
            String v = str(j, k);
            if (v != null && !v.startsWith(ISS + "/")) throw new IOException("ChatGPT sign-in configuration could not be verified.");
            d.put(k, v);
        }
        if (d.get("authorization_endpoint") == null || d.get("token_endpoint") == null) throw new IOException("ChatGPT sign-in configuration is incomplete.");
        return disc = d;
    }

    private String post(String url, String form) throws IOException {
        return net(p -> post(url, form, p));
    }

    private String post(String url, String form, Proxy p) throws IOException {
        HttpURLConnection c = open(url, p);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        c.setRequestProperty("Accept", J);
        try (OutputStream o = c.getOutputStream()) { o.write(form.getBytes(StandardCharsets.UTF_8)); }
        String j = read(c);
        int code = c.getResponseCode();
        if (code >= 400) {
            String m = str(j, "error_description");
            if (m == null) m = str(j, "message");
            if (m == null) m = str(j, "error");
            throw new Bad(code, m == null ? "HTTP " + code : m);
        }
        return j;
    }

    private static String read(HttpURLConnection c) throws IOException {
        InputStream in = c.getResponseCode() < 400 ? c.getInputStream() : c.getErrorStream();
        if (in == null) return "";
        try (InputStream i = in) { return new String(i.readAllBytes(), StandardCharsets.UTF_8); }
    }

    private <T> T net(Net<T> f) throws IOException {
        List<Proxy> ps = proxies();
        IOException first = null;
        for (int i = 0; i < ps.size(); i++) try {
            T r = f.run(ps.get(i));
            note = i == 0 ? null : "The Proxy field's proxy failed; used the system proxy " + at(ps.get(i)) + ".";
            return r;
        } catch (Bad e) {
            throw e;
        } catch (IOException e) {
            IOException w = why(e, ps.get(i));
            if (first == null) first = w;
            if (!down(e)) throw w;
        }
        throw first;
    }

    private synchronized List<Proxy> proxies() {
        Proxy m = parse(t.getOrDefault("proxy", "")), a = parse(detect());
        return m == null ? Collections.singletonList(a) : a == null || a.equals(m) ? Collections.singletonList(m) : Arrays.asList(m, a);
    }

    private static boolean down(IOException e) {
        String m = String.valueOf(e.getMessage());
        return e instanceof ConnectException || e instanceof NoRouteToHostException || m.startsWith("Unable to tunnel") || m.contains("SOCKS");
    }

    private static IOException why(IOException e, Proxy p) {
        String m = String.valueOf(e.getMessage()).replaceFirst("^Unable to tunnel through proxy\\. ", "");
        if (!down(e) && !(e instanceof java.net.SocketTimeoutException) && !(e instanceof java.net.UnknownHostException)) return e;
        if (p == null) return new IOException("Can't reach OpenAI directly (" + m + "). If you use a proxy app, enter its port under Proxy.");
        if (m.contains(NOT)) return new IOException(at(p) + " is minisvg's own ChatGPT bridge, not a proxy: clear the Proxy field.");
        return new IOException("Proxy " + at(p) + " failed (" + m + "): check its port, or clear the field to use the system proxy.");
    }

    private static String at(Proxy p) {
        InetSocketAddress a = (InetSocketAddress) p.address();
        return (p.type() == Proxy.Type.SOCKS ? "socks://" : "") + a.getHostString() + ":" + a.getPort();
    }

    private String probe() {
        Proxy p;
        boolean m;
        synchronized (this) {
            m = !t.getOrDefault("proxy", "").isEmpty();
            p = parse(m ? t.get("proxy") : detect());
        }
        String via = p == null ? "directly" : "through " + (m ? "" : "the system proxy ") + at(p);
        try {
            HttpURLConnection c = open(ISS + "/.well-known/openid-configuration", p);
            int code = c.getResponseCode();
            c.disconnect();
            return code == 200 ? "OpenAI reached " + via + "." : "OpenAI answered " + code + " " + via + ".";
        } catch (IOException e) {
            return why(e, p).getMessage();
        }
    }

    private HttpURLConnection open(String url, Proxy p) throws IOException {
        HttpURLConnection c = (HttpURLConnection) (p == null ? new URL(url).openConnection() : new URL(url).openConnection(p));
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(20000);
        c.setReadTimeout(60000);
        return c;
    }

    private static Proxy parse(String s) {
        if (s == null || s.isEmpty()) return null;
        Matcher m = Pattern.compile("^(?:(\\w+)://)?\\[?([^\\]/\\s]+?)\\]?:(\\d+)/?$").matcher(s.trim());
        if (!m.find()) return null;
        return new Proxy(m.group(1) != null && m.group(1).toLowerCase(Locale.ROOT).startsWith("socks") ? Proxy.Type.SOCKS : Proxy.Type.HTTP, new InetSocketAddress(m.group(2), Integer.parseInt(m.group(3))));
    }

    private synchronized String detect() {
        if (System.currentTimeMillis() - autoAt < 30000) return auto;
        autoAt = System.currentTimeMillis();
        String s = "";
        if (System.getProperty("https.proxyHost") == null && System.getProperty("socksProxyHost") == null) {
            for (String k : new String[]{"HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy"}) if (s.isEmpty() && System.getenv(k) != null) s = System.getenv(k).trim();
            String os = System.getProperty("os.name", "");
            if (s.isEmpty() && os.startsWith("Mac")) {
                String o = run("scutil", "--proxy");
                if ("1".equals(field(o, "HTTPSEnable"))) s = field(o, "HTTPSProxy") + ":" + field(o, "HTTPSPort");
                else if ("1".equals(field(o, "SOCKSEnable"))) s = "socks://" + field(o, "SOCKSProxy") + ":" + field(o, "SOCKSPort");
            } else if (s.isEmpty() && os.startsWith("Windows")) {
                String o = run("reg", "query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings");
                Matcher e = Pattern.compile("ProxyEnable\\s+REG_DWORD\\s+0x0*1\\b").matcher(o), v = Pattern.compile("ProxyServer\\s+REG_SZ\\s+(\\S+)").matcher(o);
                if (e.find() && v.find()) {
                    s = v.group(1);
                    Matcher h = Pattern.compile("(?:^|;)https=([^;]+)").matcher(s);
                    if (h.find()) s = h.group(1);
                    else if (s.contains("=")) s = "";
                }
            }
        }
        return auto = parse(s) == null ? "" : s;
    }

    private static String field(String o, String k) {
        Matcher m = Pattern.compile("(?m)^\\s*" + k + "\\s*:\\s*(\\S+)").matcher(o);
        return m.find() ? m.group(1) : null;
    }

    private static String run(String... cmd) {
        try {
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            byte[] b = p.getInputStream().readAllBytes();
            p.waitFor(3, TimeUnit.SECONDS);
            return new String(b, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private static boolean browse(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(url));
                return true;
            }
        } catch (Exception e) {
        }
        String os = System.getProperty("os.name", "");
        try {
            Process p = new ProcessBuilder(os.startsWith("Mac") ? new String[]{"open", url} : os.startsWith("Windows") ? new String[]{"rundll32", "url.dll,FileProtocolHandler", url} : new String[]{"xdg-open", url}).start();
            return p.waitFor(5, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void save() {
        try {
            Files.createDirectories(file.getParent());
            StringBuilder b = new StringBuilder("{");
            for (Map.Entry<String, String> e : t.entrySet()) b.append(b.length() > 1 ? "," : "").append(q(e.getKey())).append(':').append(q(e.getValue()));
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.write(tmp, b.append("}\n").toString().getBytes(StandardCharsets.UTF_8));
            try {
                Files.setPosixFilePermissions(tmp, PosixFilePermissions.fromString("rw-------"));
                Files.setPosixFilePermissions(file.getParent(), PosixFilePermissions.fromString("rwx------"));
            } catch (Exception e) {
            }
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            mt = Files.getLastModifiedTime(file).toMillis();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean share() {
        return (" " + t.getOrDefault("scope", "") + " ").contains(" " + SHARE + " ");
    }

    private long num(String k) {
        try {
            return Long.parseLong(t.getOrDefault(k, "0"));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static Map<String, String> query(String s) {
        Map<String, String> m = new LinkedHashMap<>();
        if (s != null) for (String kv : s.split("&")) {
            int i = kv.indexOf('=');
            String k = URLDecoder.decode(i < 0 ? kv : kv.substring(0, i), StandardCharsets.UTF_8);
            if (!m.containsKey(k)) m.put(k, i < 0 ? "" : URLDecoder.decode(kv.substring(i + 1), StandardCharsets.UTF_8));
        }
        return m;
    }

    private static String form(String... kv) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i + 1 < kv.length; i += 2) b.append(i > 0 ? "&" : "").append(URLEncoder.encode(kv[i], StandardCharsets.UTF_8)).append('=').append(URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8).replace("+", "%20"));
        return b.toString();
    }

    private static String str(String j, String k) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(k) + "\"\\s*:\\s*(?:\"((?:[^\"\\\\]|\\\\.)*)\"|(-?[\\d.eE+]+))").matcher(j == null ? "" : j);
        return !m.find() ? null : m.group(1) != null ? unq(m.group(1)) : m.group(2);
    }

    private static String unq(String s) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '\\' || i + 1 >= s.length()) { b.append(c); continue; }
            char e = s.charAt(++i);
            if (e == 'u' && i + 4 < s.length()) { b.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16)); i += 4; }
            else b.append(e == 'n' ? '\n' : e == 't' ? '\t' : e == 'r' ? '\r' : e == 'b' ? '\b' : e == 'f' ? '\f' : e);
        }
        return b.toString();
    }

    private static String q(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) b.append(c == '"' || c == '\\' ? "\\" + c : c < 32 || c == '<' ? String.format("\\u%04x", (int) c) : String.valueOf(c));
        return b.append('"').toString();
    }

    private static String fail(String m) {
        return "{\"error\":{\"message\":" + q(m) + "}}";
    }

    private static String page(String m) {
        return "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>ChatGPT sign-in</title><style>body{font:16px system-ui,sans-serif;max-width:34rem;margin:18vh auto;padding:24px;color:#202123}</style><h2>ChatGPT sign-in</h2><p>"
            + m.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") + "</p></html>";
    }

    private static String rnd() {
        byte[] b = new byte[32];
        RND.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }
}
