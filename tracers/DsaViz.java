import java.io.IOException;
import java.io.PrintWriter;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DsaViz.java - record a Java algorithm's execution for DSAViz.
 *
 * No dependencies, no build tool. Drop this file next to your solution and
 * compile them together:  javac DsaViz.java Solution.java
 *
 *   public static void bubble(int[] a) {
 *       for (int i = 0; i &lt; a.length; i++)
 *           for (int j = 0; j &lt; a.length - i - 1; j++) {
 *               DsaViz.watch("a", a).watch("i", i).watch("j", j);
 *               DsaViz.step(12, "compare " + a[j] + " vs " + a[j + 1]);
 *               if (a[j] &gt; a[j + 1]) { int t = a[j]; a[j] = a[j+1]; a[j+1] = t; }
 *           }
 *   }
 *
 *   public static void main(String[] args) {
 *       DsaViz.begin("Solution.java");        // embeds the source, if found
 *       bubble(new int[]{5, 3, 8, 4, 2});
 *       DsaViz.save("trace.json");
 *   }
 *
 * Then open DSAViz.html -> "My Code" and drop trace.json on the page.
 *
 * Why manual: Java has no portable per-line hook the way Python's
 * sys.settrace does, so you mark the moments that matter. One step() call
 * produces one frame in the visualizer.
 *
 * Objects with next / left / right fields are followed automatically, so a
 * ListNode or TreeNode is drawn as a real linked list or tree.
 */
public final class DsaViz {

    private static final int MAX_ITEMS = 80;
    private static final int MAX_STR = 200;
    private static final int MAX_DEPTH = 4;
    private static final int MAX_LINKED = 60;

    private static final List<String> FRAMES = new ArrayList<>();
    private static final Map<String, String> VARS = new LinkedHashMap<>();
    private static String name = "trace";
    private static String file = "";
    private static String source = "";
    private static int maxFrames = 4000;
    private static boolean truncated = false;

    private DsaViz() { }

    /* ========================== public API ========================== */

    /** Start a recording. Pass your source file name to embed it in the trace. */
    public static void begin(String sourceFile) {
        FRAMES.clear();
        VARS.clear();
        truncated = false;
        if (sourceFile != null && !sourceFile.isEmpty()) {
            file = Paths.get(sourceFile).getFileName().toString();
            name = file.replaceAll("\\.java$", "");
            source = readSource(sourceFile);
        }
    }

    public static void begin() { begin(null); }

    /** Cap the number of recorded frames (default 4000). */
    public static void limit(int n) { maxFrames = Math.max(1, n); }

    /** Record the current value of a variable. Chainable. */
    public static DsaVizChain watch(String key, Object value) {
        VARS.put(key, encode(value, 0, new IdentityHashMap<>()));
        return DsaVizChain.INSTANCE;
    }

    public static DsaVizChain watch(String key, int value)     { VARS.put(key, String.valueOf(value)); return DsaVizChain.INSTANCE; }
    public static DsaVizChain watch(String key, long value)    { VARS.put(key, String.valueOf(value)); return DsaVizChain.INSTANCE; }
    public static DsaVizChain watch(String key, double value)  { VARS.put(key, Double.isFinite(value) ? String.valueOf(value) : quote(String.valueOf(value))); return DsaVizChain.INSTANCE; }
    public static DsaVizChain watch(String key, boolean value) { VARS.put(key, String.valueOf(value)); return DsaVizChain.INSTANCE; }
    public static DsaVizChain watch(String key, char value)    { VARS.put(key, quote(String.valueOf(value))); return DsaVizChain.INSTANCE; }

    /** Stop watching a variable (it disappears from later frames). */
    public static void unwatch(String key) { VARS.remove(key); }

    /** Capture one frame. `line` is the source line to highlight (0 = none). */
    public static void step(int line, String note) {
        if (FRAMES.size() >= maxFrames) { truncated = true; return; }
        StringBuilder sb = new StringBuilder(256);
        sb.append("{\"line\":").append(line)
          .append(",\"event\":\"line\",\"func\":").append(quote(name))
          .append(",\"depth\":1,\"stack\":[").append(quote(name)).append("]");
        if (note != null && !note.isEmpty()) sb.append(",\"note\":").append(quote(note));
        sb.append(",\"vars\":{");
        boolean first = true;
        for (Map.Entry<String, String> e : VARS.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append(quote(e.getKey())).append(':').append(e.getValue());
        }
        sb.append("}}");
        FRAMES.add(sb.toString());
    }

    public static void step(int line) { step(line, null); }
    public static void step()         { step(0, null); }

    /** Write the trace file. */
    public static void save(String out) {
        StringBuilder sb = new StringBuilder(1 << 16);
        sb.append("{\"dsaviz\":1,\"lang\":\"java\",\"name\":").append(quote(name))
          .append(",\"file\":").append(quote(file))
          .append(",\"source\":").append(quote(source))
          .append(",\"sourceStart\":1,\"flow\":null,\"lineToNode\":{}")
          .append(",\"truncated\":").append(truncated)
          .append(",\"frames\":[");
        for (int i = 0; i < FRAMES.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(FRAMES.get(i));
        }
        sb.append("]}");
        try (PrintWriter w = new PrintWriter(out, "UTF-8")) {
            w.print(sb);
        } catch (IOException e) {
            System.err.println("DsaViz: could not write " + out + " - " + e.getMessage());
            return;
        }
        System.out.println("DsaViz: " + FRAMES.size() + " frames -> " + out
                + (truncated ? "  (truncated)" : ""));
    }

    public static void save() { save("trace.json"); }

    /** Lets watch(...).watch(...) chain without repeating the class name. */
    public static final class DsaVizChain {
        static final DsaVizChain INSTANCE = new DsaVizChain();
        private DsaVizChain() { }
        public DsaVizChain watch(String k, Object v)  { return DsaViz.watch(k, v); }
        public DsaVizChain watch(String k, int v)     { return DsaViz.watch(k, v); }
        public DsaVizChain watch(String k, long v)    { return DsaViz.watch(k, v); }
        public DsaVizChain watch(String k, double v)  { return DsaViz.watch(k, v); }
        public DsaVizChain watch(String k, boolean v) { return DsaViz.watch(k, v); }
        public DsaVizChain watch(String k, char v)    { return DsaViz.watch(k, v); }
        public void step(int line, String note)       { DsaViz.step(line, note); }
        public void step(int line)                    { DsaViz.step(line); }
    }

    /* ========================== encoding ========================== */

    private static String encode(Object v, int depth, IdentityHashMap<Object, Object> seen) {
        if (v == null) return "null";
        if (depth > MAX_DEPTH) return "{\"__t\":\"obj\",\"v\":\"...\"}";

        if (v instanceof Boolean || v instanceof Integer || v instanceof Long
                || v instanceof Short || v instanceof Byte) return v.toString();
        if (v instanceof Double || v instanceof Float) {
            double d = ((Number) v).doubleValue();
            return Double.isFinite(d) ? v.toString() : "{\"__t\":\"obj\",\"v\":" + quote(v.toString()) + "}";
        }
        if (v instanceof Character || v instanceof String || v instanceof CharSequence)
            return quote(trunc(v.toString()));

        if (v.getClass().isArray()) {
            int n = Math.min(Array.getLength(v), MAX_ITEMS);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < n; i++) {
                if (i > 0) sb.append(',');
                sb.append(encode(Array.get(v, i), depth + 1, seen));
            }
            if (Array.getLength(v) > n)
                sb.append(",{\"__t\":\"obj\",\"v\":\"... +")
                  .append(Array.getLength(v) - n).append("\"}");
            return sb.append(']').toString();
        }

        if (v instanceof java.util.Map) {
            StringBuilder sb = new StringBuilder("{\"__t\":\"dict\",\"v\":[");
            int i = 0;
            for (Object o : ((java.util.Map<?, ?>) v).entrySet()) {
                java.util.Map.Entry<?, ?> e = (java.util.Map.Entry<?, ?>) o;
                if (i++ >= MAX_ITEMS) break;
                if (i > 1) sb.append(',');
                sb.append('[').append(encode(e.getKey(), depth + 1, seen)).append(',')
                  .append(encode(e.getValue(), depth + 1, seen)).append(']');
            }
            return sb.append("]}").toString();
        }

        if (v instanceof java.util.Set) {
            StringBuilder sb = new StringBuilder("{\"__t\":\"set\",\"v\":[");
            int i = 0;
            for (Object o : (java.util.Set<?>) v) {
                if (i++ >= MAX_ITEMS) break;
                if (i > 1) sb.append(',');
                sb.append(encode(o, depth + 1, seen));
            }
            return sb.append("]}").toString();
        }

        if (v instanceof Iterable) {
            StringBuilder sb = new StringBuilder("[");
            int i = 0;
            for (Object o : (Iterable<?>) v) {
                if (i++ >= MAX_ITEMS) break;
                if (i > 1) sb.append(',');
                sb.append(encode(o, depth + 1, seen));
            }
            return sb.append(']').toString();
        }

        // Node-shaped user objects: draw them as real structures
        try {
            if (hasField(v, "left") || hasField(v, "right")) return encodeTree(v, depth);
            if (hasField(v, "next") && valueField(v) != null) return encodeLinked(v, depth);
        } catch (Exception ignored) { }

        return "{\"__t\":\"obj\",\"v\":" + quote(trunc(String.valueOf(v))) + "}";
    }

    private static boolean hasField(Object o, String n) {
        try { o.getClass().getField(n); return true; } catch (NoSuchFieldException e) { }
        try { o.getClass().getDeclaredField(n); return true; } catch (NoSuchFieldException e) { }
        return false;
    }

    private static Field field(Object o, String n) {
        try { return o.getClass().getField(n); } catch (NoSuchFieldException e) { }
        try {
            Field f = o.getClass().getDeclaredField(n);
            f.setAccessible(true);
            return f;
        } catch (Exception e) { return null; }
    }

    private static Object get(Object o, String n) {
        Field f = field(o, n);
        if (f == null) return null;
        try { return f.get(o); } catch (IllegalAccessException e) { return null; }
    }

    private static Object valueField(Object o) {
        for (String n : new String[]{"val", "value", "data", "key", "item"}) {
            Field f = field(o, n);
            if (f != null) {
                try { return f.get(o); } catch (IllegalAccessException ignored) { }
            }
        }
        return null;
    }

    private static String encodeLinked(Object head, int depth) {
        StringBuilder sb = new StringBuilder("{\"__t\":\"linked\",\"v\":[");
        IdentityHashMap<Object, Integer> seen = new IdentityHashMap<>();
        Object cur = head;
        int k = 0;
        Integer cycle = null;
        while (cur != null && k < MAX_LINKED) {
            if (seen.containsKey(cur)) { cycle = seen.get(cur); break; }
            seen.put(cur, k);
            if (k > 0) sb.append(',');
            sb.append(encode(valueField(cur), depth + 1, new IdentityHashMap<>()));
            cur = get(cur, "next");
            k++;
        }
        sb.append("],\"cycle\":").append(cycle == null ? "null" : cycle).append('}');
        return sb.toString();
    }

    private static String encodeTree(Object root, int depth) {
        // Collect every node first, then serialise - no buffer patching.
        IdentityHashMap<Object, String> ids = new IdentityHashMap<>();
        LinkedHashMap<String, String[]> rows = new LinkedHashMap<>();  // id -> {value, left, right}
        String rootId = treeWalk(root, ids, rows, depth);

        StringBuilder sb = new StringBuilder("{\"__t\":\"tree\",\"nodes\":{");
        boolean first = true;
        for (Map.Entry<String, String[]> e : rows.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            String[] r = e.getValue();
            sb.append(quote(e.getKey())).append(":{\"v\":").append(r[0])
              .append(",\"l\":").append(r[1] == null ? "null" : quote(r[1]))
              .append(",\"r\":").append(r[2] == null ? "null" : quote(r[2]))
              .append('}');
        }
        return sb.append("},\"root\":")
                 .append(rootId == null ? "null" : quote(rootId))
                 .append('}').toString();
    }

    private static String treeWalk(Object n, IdentityHashMap<Object, String> ids,
                                   LinkedHashMap<String, String[]> rows, int depth) {
        if (n == null || rows.size() > 80) return null;
        String existing = ids.get(n);
        if (existing != null) return existing;

        String id = "t" + ids.size();
        ids.put(n, id);
        String[] row = new String[]{encode(valueField(n), depth + 1, new IdentityHashMap<>()), null, null};
        rows.put(id, row);                       // reserve the slot before recursing
        row[1] = treeWalk(get(n, "left"), ids, rows, depth);
        row[2] = treeWalk(get(n, "right"), ids, rows, depth);
        return id;
    }

    /* ========================== helpers ========================== */

    private static String trunc(String s) {
        return s.length() > MAX_STR ? s.substring(0, MAX_STR) + "..." : s;
    }

    private static String readSource(String f) {
        for (String cand : new String[]{f, "src/" + f, "./" + f}) {
            try {
                Path p = Paths.get(cand);
                if (Files.exists(p)) return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (Exception ignored) { }
        }
        return "";
    }

    private static String quote(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 16).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    /* ========================== demo ========================== */

    public static void main(String[] args) {
        begin("DsaViz.java");
        int[] a = {5, 3, 8, 4, 2, 7, 1};
        for (int i = 0; i < a.length; i++) {
            for (int j = 0; j < a.length - i - 1; j++) {
                watch("a", a).watch("i", i).watch("j", j);
                step(0, "compare a[" + j + "]=" + a[j] + " with a[" + (j + 1) + "]=" + a[j + 1]);
                if (a[j] > a[j + 1]) {
                    int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                    watch("a", a);
                    step(0, "swapped");
                }
            }
        }
        save("trace.json");
    }
}
