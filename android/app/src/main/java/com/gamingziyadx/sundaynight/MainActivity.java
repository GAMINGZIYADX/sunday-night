package com.gamingziyadx.sundaynight;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

// The game in a full-screen WebView: no status or navigation bar (a swipe
// from the edge shows them for a moment).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemBars();
        // capacitor.config.json sets android.minWebViewVersion, the oldest
        // Chrome the game runs on. Phones from 2013-14 often still have the
        // WebView they shipped with: ask for the free Play Store update.
        if (!getBridge().isMinimumWebViewInstalled()) askForWebViewUpdate();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    private void askForWebViewUpdate() {
        new AlertDialog.Builder(this)
            .setTitle(R.string.webview_old_title)
            .setMessage(R.string.webview_old_message)
            .setPositiveButton(R.string.webview_update, (d, w) -> openStore(webViewPackage()))
            .setNegativeButton(R.string.webview_anyway, null)
            .setCancelable(false)
            .show();
    }

    // The app that provides the WebView: Chrome on Android 7, otherwise
    // Android System WebView (or whatever Android 8+ reports).
    private String webViewPackage() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageInfo p = WebView.getCurrentWebViewPackage();
            if (p != null) return p.packageName;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) return "com.android.chrome";
        return "com.google.android.webview";
    }

    private void openStore(String pkg) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)));
        } catch (ActivityNotFoundException e) {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)));
        }
    }
}
