package io.github.josephd93.friendshiptree;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "GoogleAuthDiagnostics")
public class GoogleAuthDiagnosticsPlugin extends Plugin {
    public static JSObject readRuntimeConfig(Context context) {
        JSObject result = new JSObject();
        result.put("packageName", context.getPackageName());
        result.put("webClientId", "54802084194-qiej4s3ahd0eojf26rnjtsoius482fio.apps.googleusercontent.com");
        try {
            PackageManager manager = context.getPackageManager();
            PackageInfo info;
            Signature[] signatures;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info = manager.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                signatures = info.signingInfo.getApkContentsSigners();
            } else {
                info = manager.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
                signatures = info.signatures;
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(signatures[0].toByteArray());
            StringBuilder formatted = new StringBuilder();
            for (byte value : hash) {
                if (formatted.length() > 0) formatted.append(':');
                formatted.append(String.format(Locale.US, "%02X", value & 0xff));
            }
            result.put("signingSha1", formatted.toString());
        } catch (Exception error) {
            result.put("signingSha1", "Unavailable: " + error.getClass().getSimpleName());
        }
        return result;
    }

    @PluginMethod
    public void getRuntimeConfig(PluginCall call) {
        call.resolve(readRuntimeConfig(getContext()));
    }
}
