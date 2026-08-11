package io.github.josephd93.friendshiptree;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.Plugin;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

// ModifiedMainActivityForSocialLoginPlugin is VERY VERY important !!!!!!
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    private static boolean googleDiagnosticShown = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuthDiagnosticsPlugin.class);
        registerPlugin(GoogleDriveAuthorizationPlugin.class);
        super.onCreate(savedInstanceState);
        if (!googleDiagnosticShown) {
            googleDiagnosticShown = true;
            JSObject config = GoogleAuthDiagnosticsPlugin.readRuntimeConfig(this);
            new AlertDialog.Builder(this)
                .setTitle("Google sign-in configuration")
                .setMessage("Package: " + config.getString("packageName")
                    + "\n\nSigning SHA-1: " + config.getString("signingSha1")
                    + "\n\nWeb client ID: " + config.getString("webClientId"))
                .setPositiveButton("OK", null)
                .show();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Refresh the home-screen tracker after in-app changes have been
        // mirrored to Capacitor Preferences.
        Intent refreshWidget = new Intent(this, HealthWidgetProvider.class);
        refreshWidget.setAction(HealthWidgetProvider.ACTION_REFRESH);
        sendBroadcast(refreshWidget);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == GoogleDriveAuthorizationPlugin.REQUEST_AUTHORIZE_DRIVE) {
            PluginHandle authorizationHandle = getBridge().getPlugin("GoogleDriveAuthorization");
            if (authorizationHandle != null && authorizationHandle.getInstance() instanceof GoogleDriveAuthorizationPlugin) {
                ((GoogleDriveAuthorizationPlugin) authorizationHandle.getInstance())
                    .handleAuthorizationResult(resultCode, data);
            }
            return;
        }

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // This function will never be called, leave it empty
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
