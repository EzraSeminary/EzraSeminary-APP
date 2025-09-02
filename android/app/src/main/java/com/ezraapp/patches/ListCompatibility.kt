package com.ezraapp.patches

import android.os.Build
import java.util.*

/**
 * Compatibility layer for List methods that are not available on older Android versions.
 * This provides safe alternatives for removeFirst() and removeLast() methods.
 * 
 * Note: Always uses removeAt() to avoid conflicts with Java functions in Android 15+.
 */
object ListCompatibility {
    
    /**
     * Safely removes and returns the first element from a list.
     * Always uses removeAt(0) to ensure compatibility across all Android versions.
     */
    @JvmStatic
    fun <T> removeFirst(list: MutableList<T>): T? {
        return if (list.isNotEmpty()) list.removeAt(0) else null
    }
    
    /**
     * Safely removes and returns the last element from a list.
     * Always uses removeAt(list.lastIndex) to ensure compatibility across all Android versions.
     */
    @JvmStatic
    fun <T> removeLast(list: MutableList<T>): T? {
        return if (list.isNotEmpty()) list.removeAt(list.lastIndex) else null
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