package io.github.josephd93.friendshiptree;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class HealthWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_INCREMENT = "io.github.josephd93.friendshiptree.HEALTH_INCREMENT";
    public static final String ACTION_REFRESH = "io.github.josephd93.friendshiptree.HEALTH_REFRESH";
    private static final String CAPACITOR_PREFS = "CapacitorStorage";
    private static final String WIDGET_PREFS = "FriendshipTreeHealthWidgets";
    private static final String STATE_KEY = "ft_widget_health_state";
    private static final String LIST_KEY_PREFIX = "list_";
    private static final String ROWS_KEY_PREFIX = "rows_";
    private static final String COLS_KEY_PREFIX = "cols_";
    private static final int MAX_ITEMS = 24;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        rolloverIfNeeded(context);
        for (int widgetId : widgetIds) render(context, manager, widgetId);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        SharedPreferences.Editor editor = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit();
        for (int widgetId : widgetIds) editor.remove(LIST_KEY_PREFIX + widgetId)
            .remove(ROWS_KEY_PREFIX + widgetId).remove(COLS_KEY_PREFIX + widgetId);
        editor.apply();
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (ACTION_INCREMENT.equals(action)) {
            increment(context, intent.getStringExtra("listId"), intent.getStringExtra("categoryId"));
        } else if (!ACTION_REFRESH.equals(action)) {
            return;
        }
        rolloverIfNeeded(context);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            render(context, manager, widgetId);
        } else {
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, HealthWidgetProvider.class));
            for (int id : ids) render(context, manager, id);
        }
    }

    public static void setSelectedList(Context context, int widgetId, String listId) {
        context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            .edit().putString(LIST_KEY_PREFIX + widgetId, listId).apply();
    }

    public static void setGrid(Context context, int widgetId, int rows, int columns) {
        context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit()
            .putInt(ROWS_KEY_PREFIX + widgetId, Math.max(1, Math.min(8, rows)))
            .putInt(COLS_KEY_PREFIX + widgetId, Math.max(1, Math.min(6, columns))).apply();
    }

    public static String getSelectedListId(Context context, int widgetId) {
        return context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            .getString(LIST_KEY_PREFIX + widgetId, "");
    }

    public static int getRows(Context context, int widgetId, int fallback) {
        return context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            .getInt(ROWS_KEY_PREFIX + widgetId, fallback);
    }

    public static int getColumns(Context context, int widgetId, int fallback) {
        return context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            .getInt(COLS_KEY_PREFIX + widgetId, fallback);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, android.os.Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, manager, widgetId, newOptions);
        render(context, manager, widgetId);
    }

    public static JSONObject readState(Context context) {
        try {
            String raw = context.getSharedPreferences(CAPACITOR_PREFS, Context.MODE_PRIVATE)
                .getString(STATE_KEY, null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception ignored) { return null; }
    }

    public static void render(Context context, AppWidgetManager manager, int widgetId) {
        rolloverIfNeeded(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.health_widget);
        JSONObject state = readState(context);
        JSONObject list = selectedList(context, state, widgetId);
        JSONArray categories = list == null ? null : list.optJSONArray("categories");
        JSONObject today = state == null ? null : state.optJSONObject("today");
        String listId = list == null ? "" : list.optString("id", "");
        JSONObject counts = today == null ? null : today.optJSONObject(listId);

        views.removeAllViews(R.id.health_widget_grid);
        if (categories != null && categories.length() > 0) {
            SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
            int columns = prefs.getInt(COLS_KEY_PREFIX + widgetId, Math.max(1, Math.min(6, list.optInt("gridCols", 3))));
            int rows = prefs.getInt(ROWS_KEY_PREFIX + widgetId, Math.max(1, (int) Math.ceil(Math.min(MAX_ITEMS, categories.length()) / (double) columns)));
            columns = Math.max(1, Math.min(6, columns));
            rows = Math.max(1, Math.min(8, rows));
            int shown = Math.min(Math.min(MAX_ITEMS, categories.length()), rows * columns);
            android.os.Bundle options = manager.getAppWidgetOptions(widgetId);
            // Android reports a size range. In portrait, the useful widget size is
            // normally MIN_WIDTH x MAX_HEIGHT; using MIN_HEIGHT here made circles
            // unnecessarily small because that is the landscape height.
            int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
            int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180));
            int availableWidth = Math.max(72, widthDp - 12);
            int availableHeight = Math.max(64, heightDp - 12);
            int cellDp = Math.max(40, Math.min(120,
                Math.min(availableWidth / columns, availableHeight / rows)));
            int bitmapPx = Math.max(96, Math.round(cellDp * context.getResources().getDisplayMetrics().density));
            for (int start = 0; start < shown; start += columns) {
                RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.health_widget_row);
                for (int i = start; i < Math.min(start + columns, shown); i++) {
                    JSONObject category = categories.optJSONObject(i);
                    String categoryId = category.optString("id", "");
                    int count = counts == null ? 0 : counts.optInt(categoryId, 0);
                    int target = Math.max(1, category.optInt("target", 1));
                    RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.health_widget_cell);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                        // A fixed square cell keeps neighbouring circles close. The old
                        // weighted cells filled the entire row and created large gaps.
                        cell.setViewLayoutWidth(R.id.health_widget_circle, cellDp,
                            android.util.TypedValue.COMPLEX_UNIT_DIP);
                        cell.setViewLayoutHeight(R.id.health_widget_circle, cellDp,
                            android.util.TypedValue.COMPLEX_UNIT_DIP);
                    }
                    cell.setImageViewBitmap(R.id.health_widget_circle,
                        circleBitmap(list.optString("color", "#10b981"), count, target, category.optString("icon", "✓"), bitmapPx));
                    cell.setContentDescription(R.id.health_widget_circle,
                        category.optString("label", "Item") + ", " + count + " of " + target);
                    Intent increment = new Intent(context, HealthWidgetProvider.class)
                        .setAction(ACTION_INCREMENT)
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                        .putExtra("listId", listId)
                        .putExtra("categoryId", categoryId);
                    PendingIntent pending = PendingIntent.getBroadcast(context,
                        widgetId * 100 + i, increment, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    cell.setOnClickPendingIntent(R.id.health_widget_circle, pending);
                    row.addView(R.id.health_widget_row, cell);
                }
                views.addView(R.id.health_widget_grid, row);
            }
        }
        manager.updateAppWidget(widgetId, views);
    }

    private static Bitmap circleBitmap(String colorString, int count, int target, String icon, int requestedSize) {
        final int size = Math.max(96, Math.min(360, requestedSize));
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        int baseColor;
        try { baseColor = Color.parseColor(colorString); } catch (Exception ignored) { baseColor = Color.rgb(16, 185, 129); }
        float progress = Math.min(1f, Math.max(0f, count / (float) Math.max(1, target)));
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(blend(Color.argb(28, Color.red(baseColor), Color.green(baseColor), Color.blue(baseColor)), baseColor, progress));
        float radius = size * 0.44f;
        canvas.drawCircle(size / 2f, size / 2f, radius, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(Math.max(4f, size * 0.045f));
        paint.setColor(baseColor);
        canvas.drawCircle(size / 2f, size / 2f, radius - paint.getStrokeWidth() / 2f, paint);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.WHITE);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTextSize(size * 0.44f);
        paint.setTypeface(Typeface.DEFAULT);
        Paint.FontMetrics fm = paint.getFontMetrics();
        float y = size / 2f - (fm.ascent + fm.descent) / 2f;
        canvas.drawText(icon == null || icon.isEmpty() ? "✓" : icon, size / 2f, y, paint);
        return bitmap;
    }

    private static int blend(int from, int to, float amount) {
        return Color.argb(
            Math.round(Color.alpha(from) + (Color.alpha(to) - Color.alpha(from)) * amount),
            Math.round(Color.red(from) + (Color.red(to) - Color.red(from)) * amount),
            Math.round(Color.green(from) + (Color.green(to) - Color.green(from)) * amount),
            Math.round(Color.blue(from) + (Color.blue(to) - Color.blue(from)) * amount));
    }

    private static void increment(Context context, String listId, String categoryId) {
        if (listId == null || categoryId == null) return;
        try {
            rolloverIfNeeded(context);
            JSONObject state = readState(context);
            if (state == null) return;
            JSONObject today = state.optJSONObject("today");
            if (today == null) today = new JSONObject();
            JSONObject counts = today.optJSONObject(listId);
            if (counts == null) counts = new JSONObject();
            counts.put(categoryId, counts.optInt(categoryId, 0) + 1);
            today.put(listId, counts);
            state.put("today", today);
            writeState(context, state);
        } catch (Exception ignored) {}
    }

    private static void rolloverIfNeeded(Context context) {
        try {
            JSONObject state = readState(context);
            if (state == null) return;
            String now = new SimpleDateFormat("yyyy-MM-dd", Locale.UK).format(new Date());
            String previous = state.optString("lastResetDate", now);
            if (now.equals(previous)) return;
            JSONObject today = state.optJSONObject("today");
            if (today == null) today = new JSONObject();
            JSONObject history = state.optJSONObject("history");
            if (history == null) history = new JSONObject();
            if (!history.has(previous)) history.put(previous, today);
            state.put("history", history);
            state.put("today", new JSONObject());
            state.put("lastResetDate", now);
            writeState(context, state);
        } catch (Exception ignored) {}
    }

    private static void writeState(Context context, JSONObject state) throws Exception {
        state.put("updatedAt", System.currentTimeMillis());
        context.getSharedPreferences(CAPACITOR_PREFS, Context.MODE_PRIVATE)
            .edit().putString(STATE_KEY, state.toString()).commit();
    }

    private static JSONObject selectedList(Context context, JSONObject state, int widgetId) {
        if (state == null) return null;
        JSONArray lists = state.optJSONArray("lists");
        if (lists == null || lists.length() == 0) return null;
        String selected = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            .getString(LIST_KEY_PREFIX + widgetId, "");
        for (int i = 0; i < lists.length(); i++) {
            JSONObject list = lists.optJSONObject(i);
            if (list != null && selected.equals(list.optString("id", ""))) return list;
        }
        JSONObject first = lists.optJSONObject(0);
        if (first != null) setSelectedList(context, widgetId, first.optString("id", ""));
        return first;
    }

}
