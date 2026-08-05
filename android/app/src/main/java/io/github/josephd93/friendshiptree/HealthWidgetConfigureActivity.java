package io.github.josephd93.friendshiptree;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Gravity;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.NumberPicker;
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

        LinearLayout pickers = new LinearLayout(this);
        pickers.setOrientation(LinearLayout.HORIZONTAL);
        pickers.setGravity(Gravity.CENTER);
        int listPosition = selectedPosition >= 0 ? selectedPosition : 0;
        JSONObject selectedList = lists.optJSONObject(listPosition);
        int defaultColumns = Math.max(1, Math.min(6, selectedList == null ? 3 : selectedList.optInt("gridCols", 3)));
        int itemCount = selectedList == null || selectedList.optJSONArray("categories") == null ? 1 : selectedList.optJSONArray("categories").length();
        int defaultRows = Math.max(1, Math.min(8, (int) Math.ceil(itemCount / (double) defaultColumns)));
        NumberPicker columns = picker(1, 6, HealthWidgetProvider.getColumns(this, widgetId, defaultColumns));
        NumberPicker rows = picker(1, 8, HealthWidgetProvider.getRows(this, widgetId, defaultRows));
        pickers.addView(pickerGroup("Columns", columns), new LinearLayout.LayoutParams(0, -2, 1));
        pickers.addView(pickerGroup("Rows", rows), new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(pickers, new LinearLayout.LayoutParams(-1, 0, 1));

        TextView help = label("Grid uses both row and column settings. List format uses the row count; each tap fills the next daily progress dot.", 14);
        help.setTextColor(Color.rgb(167, 243, 208));
        root.addView(help);
        Button save = new Button(this);
        save.setText("Save widget");
        save.setTextSize(17);
        save.setOnClickListener(view -> {
            int position = tracker.getSelectedItemPosition();
            HealthWidgetProvider.setSelectedList(this, widgetId, ids.get(Math.max(0, position)));
            HealthWidgetProvider.setGrid(this, widgetId, rows.getValue(), columns.getValue());
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

    private NumberPicker picker(int min, int max, int value) {
        NumberPicker picker = new NumberPicker(this);
        picker.setMinValue(min);
        picker.setMaxValue(max);
        picker.setValue(value);
        picker.setWrapSelectorWheel(false);
        return picker;
    }

    private LinearLayout pickerGroup(String name, NumberPicker picker) {
        LinearLayout group = new LinearLayout(this);
        group.setOrientation(LinearLayout.VERTICAL);
        group.setGravity(Gravity.CENTER);
        group.addView(label(name, 16));
        group.addView(picker);
        return group;
    }
}
