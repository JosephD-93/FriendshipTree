package io.github.josephd93.friendshiptree;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import java.util.Collections;

@CapacitorPlugin(name = "GoogleDriveAuthorization")
public class GoogleDriveAuthorizationPlugin extends Plugin {
    public static final int REQUEST_AUTHORIZE_DRIVE = 49217;
    private static final String DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    private PluginCall pendingCall;

    @PluginMethod
    public void authorize(PluginCall call) {
        if (pendingCall != null) {
            call.reject("A Google Drive authorization request is already open", "AUTH_IN_PROGRESS");
            return;
        }

        String requestedScope = call.getString("scope", DRIVE_FILE_SCOPE);
        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope(requestedScope)))
            .build();

        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener(result -> {
                if (result.hasResolution()) {
                    pendingCall = call;
                    try {
                        getActivity().startIntentSenderForResult(
                            result.getPendingIntent().getIntentSender(),
                            REQUEST_AUTHORIZE_DRIVE,
                            null,
                            0,
                            0,
                            0
                        );
                    } catch (IntentSender.SendIntentException error) {
                        pendingCall = null;
                        reject(call, "Could not open the Google Drive permission screen", error);
                    }
                } else {
                    resolve(call, result);
                }
            })
            .addOnFailureListener(error -> reject(call, "Google Drive authorization failed", error));
    }

    public void handleAuthorizationResult(int resultCode, Intent data) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;
        if (resultCode != Activity.RESULT_OK || data == null) {
            call.reject("Google Drive permission was not granted", "AUTH_CANCELLED");
            return;
        }
        try {
            AuthorizationResult result = Identity.getAuthorizationClient(getActivity())
                .getAuthorizationResultFromIntent(data);
            resolve(call, result);
        } catch (ApiException error) {
            reject(call, "Google Drive permission failed", error);
        }
    }

    private void resolve(PluginCall call, AuthorizationResult result) {
        String token = result.getAccessToken();
        if (token == null || token.isEmpty()) {
            call.reject("Google Drive permission succeeded without an access token", "TOKEN_MISSING");
            return;
        }
        JSObject response = new JSObject();
        response.put("accessToken", token);
        call.resolve(response);
    }

    private void reject(PluginCall call, String message, Exception error) {
        String code = error instanceof ApiException
            ? String.valueOf(((ApiException) error).getStatusCode())
            : error.getClass().getSimpleName();
        call.reject(message + ": [" + code + "] " + error.getMessage(), code, error);
    }
}
