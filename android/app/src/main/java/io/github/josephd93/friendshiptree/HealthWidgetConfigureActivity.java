package io.github.josephd93.friendshiptree;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Bundle;
import android.view.View;
import android.view.Gravity;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.AdapterView;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class HealthWidgetConfigureActivity extends Activity {
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);
        widgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

        JSONObject state = HealthWidgetProvider.readState(this);
        JSONArray lists = state == null ? null : state.optJSONArray("lists");
        if (lists == null || lists.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("Open FriendshipTree and create a health tracker first.");
            empty.setTextColor(Color.WHITE);
            empty.setTextSize(18);
            empty.setPadding(48, 80, 48, 48);
            empty.setBackgroundColor(Color.rgb(15, 23, 42));
            setContentView(empty);
            return;
        }

        List<String> labels = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < lists.length(); i++) {
            JSONObject list = lists.optJSONObject(i);
            labels.add(list.optString("icon", "") + "  " + list.optString("name", "Health tracker"));
            ids.add(list.optString("id", ""));
        }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(36, 36, 36, 28);
        root.setBackgroundColor(Color.rgb(15, 23, 42));

        TextView heading = label("Choose tracker, format and colour", 22);
        root.addView(heading);
        Spinner tracker = new Spinner(this);
        tracker.setAdapter(new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, labels) {
            @Override public View getView(int position, View convertView, android.view.ViewGroup parent) {
                TextView view = (TextView) super.getView(position, convertView, parent);
                view.setTextColor(Color.WHITE);
                view.setTextSize(18);
                view.setPadding(16, 22, 16, 22);
                return view;
            }
        });
        root.addView(tracker, new LinearLayout.LayoutParams(-1, -2));

        root.addView(label("Widget format", 16));
        Spinner formats = new Spinner(this);
        List<String> formatLabels = java.util.Arrays.asList("Circle grid", "List with progress dots");
        formats.setAdapter(spinnerAdapter(formatLabels));
        formats.setSelection("list".equals(HealthWidgetProvider.getFormat(this, widgetId)) ? 1 : 0);
        root.addView(formats, new LinearLayout.LayoutParams(-1, -2));

        root.addView(label("Accent colour", 16));
        Spinner colours = new Spinner(this);
        List<String> colourLabels = java.util.Arrays.asList(
            "Tracker colour", "Emerald", "Blue", "Purple", "Pink", "Orange", "Match wallpaper");
        List<String> colourModes = java.util.Arrays.asList(
            "tracker", "emerald", "blue", "purple", "pink", "orange", "wallpaper");
        colours.setAdapter(spinnerAdapter(colourLabels));
        int colourPosition = colourModes.indexOf(HealthWidgetProvider.getColorMode(this, widgetId));
        colours.setSelection(colourPosition >= 0 ? colourPosition : 0);
        root.addView(colours, new LinearLayout.LayoutParams(-1, -2));

        String selectedId = HealthWidgetProvider.getSelectedListId(this, widgetId);
        int selectedPosition = ids.indexOf(selectedId);
        if (selectedPosition >= 0) tracker.setSelection(selectedPosition);

        int listPosition = selectedPosition >= 0 ? selectedPosition : 0;
        JSONObject selectedList = lists.optJSONObject(listPosition);
        int defaultColumns = Math.max(1, Math.min(6, selectedList == null ? 3 : selectedList.optInt("gridCols", 3)));
        int itemCount = categoryCount(selectedList);
        int defaultRows = Math.max(1, Math.min(8, (int) Math.ceil(itemCount / (double) defaultColumns)));
        GridSizePreview gridPreview = new GridSizePreview(
            HealthWidgetProvider.getRows(this, widgetId, defaultRows),
            HealthWidgetProvider.getColumns(this, widgetId, defaultColumns));
        gridPreview.setItemCount(itemCount);
        gridPreview.setAccent(resolveAccent(colourModes.get(colours.getSelectedItemPosition()), selectedList));
        root.addView(label("Tap a circle to choose the widget grid", 16));
        root.addView(gridPreview, new LinearLayout.LayoutParams(-1, dp(360)));

        tracker.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                JSONObject chosen = lists.optJSONObject(position);
                gridPreview.setItemCount(categoryCount(chosen));
                gridPreview.setAccent(resolveAccent(colourModes.get(Math.max(0, colours.getSelectedItemPosition())), chosen));
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        colours.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                JSONObject chosen = lists.optJSONObject(Math.max(0, tracker.getSelectedItemPosition()));
                gridPreview.setAccent(resolveAccent(colourModes.get(Math.max(0, position)), chosen));
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });

        TextView help = label("Coloured circles show tracker items. Pale circles are spare spaces. List format uses the selected row count.", 14);
        help.setTextColor(Color.rgb(167, 243, 208));
        root.addView(help);
        Button save = new Button(this);
        save.setText("Save widget");
        save.setTextSize(17);
        save.setOnClickListener(view -> {
            int position = tracker.getSelectedItemPosition();
            HealthWidgetProvider.setSelectedList(this, widgetId, ids.get(Math.max(0, position)));
            HealthWidgetProvider.setGrid(this, widgetId, gridPreview.getRows(), gridPreview.getColumns());
            HealthWidgetProvider.setFormat(this, widgetId,
                formats.getSelectedItemPosition() == 1 ? "list" : "grid");
            HealthWidgetProvider.setColorMode(this, widgetId,
                colourModes.get(Math.max(0, colours.getSelectedItemPosition())));
            AppWidgetManager manager = AppWidgetManager.getInstance(this);
            HealthWidgetProvider.render(this, manager, widgetId);
            Intent result = new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            setResult(RESULT_OK, result);
            finish();
        });
        root.addView(save, new LinearLayout.LayoutParams(-1, -2));
        setTitle("Choose a health tracker");
        setContentView(root);
    }

    private ArrayAdapter<String> spinnerAdapter(List<String> labels) {
        return new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, labels) {
            @Override public View getView(int position, View convertView, android.view.ViewGroup parent) {
                TextView view = (TextView) super.getView(position, convertView, parent);
                view.setTextColor(Color.WHITE);
                view.setTextSize(17);
                view.setPadding(16, 18, 16, 18);
                return view;
            }
        };
    }

    private TextView label(String text, int size) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.WHITE);
        view.setTextSize(size);
        view.setPadding(8, 12, 8, 12);
        return view;
    }

    private int categoryCount(JSONObject list) {
        JSONArray categories = list == null ? null : list.optJSONArray("categories");
        return categories == null ? 0 : categories.length();
    }

    private int resolveAccent(String mode, JSONObject list) {
        if ("emerald".equals(mode)) return Color.rgb(16, 185, 129);
        if ("blue".equals(mode)) return Color.rgb(59, 130, 246);
        if ("purple".equals(mode)) return Color.rgb(168, 85, 247);
        if ("pink".equals(mode)) return Color.rgb(236, 72, 153);
        if ("orange".equals(mode)) return Color.rgb(249, 115, 22);
        if ("wallpaper".equals(mode) && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S)
            return getColor(android.R.color.system_accent1_300);
        try { return Color.parseColor(list == null ? "#10B981" : list.optString("color", "#10B981")); }
        catch (Exception ignored) { return Color.rgb(16, 185, 129); }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class GridSizePreview extends View {
        private static final int MAX_COLUMNS = 6;
        private static final int MAX_ROWS = 8;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private int rows;
        private int columns;
        private int itemCount;
        private int accent = Color.rgb(16, 185, 129);

        GridSizePreview(int rows, int columns) {
            super(HealthWidgetConfigureActivity.this);
            this.rows = Math.max(1, Math.min(MAX_ROWS, rows));
            this.columns = Math.max(1, Math.min(MAX_COLUMNS, columns));
            updateDescription();
            setOnTouchListener((view, event) -> {
                if (event.getAction() != android.view.MotionEvent.ACTION_UP) return true;
                float cellWidth = getWidth() / (float) MAX_COLUMNS;
                float cellHeight = getHeight() / (float) MAX_ROWS;
                GridSizePreview.this.columns = Math.max(1, Math.min(MAX_COLUMNS, (int) (event.getX() / cellWidth) + 1));
                GridSizePreview.this.rows = Math.max(1, Math.min(MAX_ROWS, (int) (event.getY() / cellHeight) + 1));
                updateDescription();
                announceForAccessibility(getContentDescription());
                invalidate();
                return true;
            });
        }

        int getRows() { return rows; }
        int getColumns() { return columns; }
        void setItemCount(int count) { itemCount = Math.max(0, count); invalidate(); }
        void setAccent(int color) { accent = color; invalidate(); }
        private void updateDescription() {
            setContentDescription(columns + " by " + rows + " grid, " + (rows * columns) + " spaces");
        }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float cellWidth = getWidth() / (float) MAX_COLUMNS;
            float cellHeight = (getHeight() - dp(24)) / (float) MAX_ROWS;
            float radius = Math.min(cellWidth, cellHeight) * 0.32f;
            int selectedSpaces = rows * columns;
            int paleAccent = Color.argb(75, Color.red(accent), Color.green(accent), Color.blue(accent));
            int outside = Color.argb(85, 148, 163, 184);
            for (int row = 0; row < MAX_ROWS; row++) {
                for (int column = 0; column < MAX_COLUMNS; column++) {
                    int selectedIndex = row * columns + column;
                    boolean inside = row < rows && column < columns;
                    float x = column * cellWidth + cellWidth / 2f;
                    float y = row * cellHeight + cellHeight / 2f;
                    paint.setStyle(Paint.Style.FILL);
                    paint.setColor(!inside ? Color.argb(18, 148, 163, 184)
                        : selectedIndex < Math.min(itemCount, selectedSpaces) ? accent : paleAccent);
                    canvas.drawCircle(x, y, radius, paint);
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(dp(inside ? 2 : 1));
                    paint.setColor(inside ? accent : outside);
                    canvas.drawCircle(x, y, radius, paint);
                }
            }
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.WHITE);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(dp(15));
            canvas.drawText(columns + " × " + rows + "  •  " + selectedSpaces + " spaces",
                getWidth() / 2f, getHeight() - dp(3), paint);
        }
    }
}
