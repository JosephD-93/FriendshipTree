package io.github.josephd93.friendshiptree;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.Plugin;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

// ModifiedMainActivityForSocialLoginPlugin is VERY VERY important !!!!!!
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    private static final String LIFECYCLE_TAG = "FT-Lifecycle";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(LIFECYCLE_TAG, "onCreate savedState=" + (savedInstanceState != null));
        registerPlugin(GoogleDriveAuthorizationPlugin.class);
        super.onCreate(savedInstanceState);

        // FriendshipTree can hold many decoded profile/gallery images. Android may otherwise
        // reclaim the WebView renderer as soon as the activity is backgrounded, which makes
        // returning to the app look like a full page refresh and forces the photos to decode
        // again. Keep the renderer bound to this foreground activity and do not waive its
        // priority merely because the WebView is temporarily not visible.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, false);
            Log.i(LIFECYCLE_TAG, "WebView renderer priority policy set to BOUND / waiveWhenNotVisible=false");
        } else if (webView == null) {
            Log.w(LIFECYCLE_TAG, "WebView unavailable while applying renderer priority policy");
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.i(LIFECYCLE_TAG, "onStart");
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i(LIFECYCLE_TAG, "onResume");
    }

    @Override
    public void onPause() {
        Log.i(LIFECYCLE_TAG, "onPause");
        super.onPause();
        // Refresh the home-screen tracker after in-app changes have been
        // mirrored to Capacitor Preferences.
        Intent refreshWidget = new Intent(this, HealthWidgetProvider.class);
        refreshWidget.setAction(HealthWidgetProvider.ACTION_REFRESH);
        sendBroadcast(refreshWidget);
    }

    @Override
    public void onStop() {
        super.onStop();
        Log.i(LIFECYCLE_TAG, "onStop");
    }

    @Override
    public void onDestroy() {
        Log.i(LIFECYCLE_TAG, "onDestroy changingConfigurations=" + isChangingConfigurations());
        super.onDestroy();
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
