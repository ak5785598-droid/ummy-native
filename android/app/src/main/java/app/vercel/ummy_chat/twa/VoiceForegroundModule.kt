package app.vercel.ummy_chat.twa

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VoiceForegroundModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VoiceForegroundService"

    @ReactMethod
    fun startService() {
        try {
            val intent = Intent(reactContext, VoiceForegroundService::class.java).apply {
                action = VoiceForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            // Silently fail — voice still works, just no persistent notification
        }
    }

    @ReactMethod
    fun stopService() {
        try {
            val intent = Intent(reactContext, VoiceForegroundService::class.java).apply {
                action = VoiceForegroundService.ACTION_STOP
            }
            reactContext.startService(intent)
        } catch (e: Exception) {
            // Silently fail
        }
    }
}
