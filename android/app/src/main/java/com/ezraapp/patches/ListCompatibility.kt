package com.ezraapp.patches

import android.os.Build
import java.util.*

/**
 * Compatibility layer for List methods that are not available on older Android versions.
 * This provides safe alternatives for removeFirst() and removeLast() methods.
 */
object ListCompatibility {
    
    /**
     * Safely removes and returns the first element from a list.
     * Uses remove(0) on older Android versions where removeFirst() is not available.
     */
    @JvmStatic
    fun <T> removeFirst(list: MutableList<T>): T? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 15+ has native removeFirst()
            try {
                list.removeFirst()
            } catch (e: NoSuchMethodError) {
                // Fallback to manual removal
                if (list.isNotEmpty()) list.removeAt(0) else null
            }
        } else {
            // Older Android versions - use remove(0)
            if (list.isNotEmpty()) list.removeAt(0) else null
        }
    }
    
    /**
     * Safely removes and returns the last element from a list.
     * Uses remove(size-1) on older Android versions where removeLast() is not available.
     */
    @JvmStatic
    fun <T> removeLast(list: MutableList<T>): T? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 15+ has native removeLast()
            try {
                list.removeLast()
            } catch (e: NoSuchMethodError) {
                // Fallback to manual removal
                if (list.isNotEmpty()) list.removeAt(list.size - 1) else null
            }
        } else {
            // Older Android versions - use remove(size-1)
            if (list.isNotEmpty()) list.removeAt(list.size - 1) else null
        }
    }
    
    /**
     * Safely removes and returns the element at the specified index.
     */
    @JvmStatic
    fun <T> removeAt(list: MutableList<T>, index: Int): T? {
        return try {
            if (index >= 0 && index < list.size) {
                list.removeAt(index)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
} 