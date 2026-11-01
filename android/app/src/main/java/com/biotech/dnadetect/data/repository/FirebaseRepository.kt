package com.biotech.dnadetect.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.biotech.dnadetect.data.model.AnalysisRecord
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class UserProfile(
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val institution: String = ""
)

private data class LocalStoredAccount(
    val uid: String,
    val email: String,
    val password: String,
    val displayName: String,
    val institution: String
)

class FirebaseRepository {

    private val auth: FirebaseAuth? by lazy {
        try {
            FirebaseAuth.getInstance()
        } catch (e: Exception) {
            null
        }
    }

    private val firestore: FirebaseFirestore? by lazy {
        try {
            FirebaseFirestore.getInstance()
        } catch (e: Exception) {
            null
        }
    }

    // In-memory cache for demo/guest mode and offline fallback
    private val demoAnalyses = mutableListOf<AnalysisRecord>()

    companion object {
        private const val PREFS_NAME = "biodna_auth_prefs"
        private const val KEY_ACCOUNTS = "registered_accounts"
        private const val KEY_ACTIVE_USER = "active_user_session"

        private var appContext: Context? = null
        private val memoryAccounts = mutableMapOf<String, LocalStoredAccount>()
        private var activeProfile: UserProfile? = null
        private var isDemoMode: Boolean = false

        fun init(context: Context) {
            appContext = context.applicationContext
            loadPersistedAccounts()
            loadPersistedSession()
        }

        private fun getPrefs(): SharedPreferences? {
            return appContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }

        private fun loadPersistedAccounts() {
            try {
                val prefs = getPrefs() ?: return
                val jsonStr = prefs.getString(KEY_ACCOUNTS, null) ?: return
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val email = obj.optString("email").lowercase().trim()
                    if (email.isNotEmpty()) {
                        memoryAccounts[email] = LocalStoredAccount(
                            uid = obj.optString("uid"),
                            email = email,
                            password = obj.optString("password"),
                            displayName = obj.optString("displayName"),
                            institution = obj.optString("institution")
                        )
                    }
                }
            } catch (e: Exception) {
                // Ignore parse errors
            }
        }

        private fun persistAccounts() {
            try {
                val prefs = getPrefs() ?: return
                val array = JSONArray()
                for (acc in memoryAccounts.values) {
                    val obj = JSONObject()
                    obj.put("uid", acc.uid)
                    obj.put("email", acc.email)
                    obj.put("password", acc.password)
                    obj.put("displayName", acc.displayName)
                    obj.put("institution", acc.institution)
                    array.put(obj)
                }
                prefs.edit().putString(KEY_ACCOUNTS, array.toString()).apply()
            } catch (e: Exception) {
                // Ignore write errors
            }
        }

        private fun loadPersistedSession() {
            try {
                val prefs = getPrefs() ?: return
                val userStr = prefs.getString(KEY_ACTIVE_USER, null) ?: return
                val obj = JSONObject(userStr)
                activeProfile = UserProfile(
                    uid = obj.optString("uid"),
                    email = obj.optString("email"),
                    displayName = obj.optString("displayName"),
                    institution = obj.optString("institution")
                )
            } catch (e: Exception) {
                activeProfile = null
            }
        }

        private fun persistSession(profile: UserProfile?) {
            try {
                val prefs = getPrefs() ?: return
                if (profile == null) {
                    prefs.edit().remove(KEY_ACTIVE_USER).apply()
                } else {
                    val obj = JSONObject()
                    obj.put("uid", profile.uid)
                    obj.put("email", profile.email)
                    obj.put("displayName", profile.displayName)
                    obj.put("institution", profile.institution)
                    prefs.edit().putString(KEY_ACTIVE_USER, obj.toString()).apply()
                }
            } catch (e: Exception) {
                // Ignore
            }
        }
    }

    val currentUser: FirebaseUser?
        get() = auth?.currentUser

    val isUserLoggedIn: Boolean
        get() = (auth?.currentUser != null) || (activeProfile != null) || isDemoMode

    val userEmail: String
        get() {
            val fbEmail = auth?.currentUser?.email
            if (!fbEmail.isNullOrBlank()) return fbEmail
            val localEmail = activeProfile?.email
            if (!localEmail.isNullOrBlank()) return localEmail
            return if (isDemoMode) "demo.researcher@biodna.internal" else ""
        }

    val userId: String
        get() {
            val fbUid = auth?.currentUser?.uid
            if (!fbUid.isNullOrBlank()) return fbUid
            val localUid = activeProfile?.uid
            if (!localUid.isNullOrBlank()) return localUid
            return if (isDemoMode) "demo-researcher-android" else ""
        }

    val userDisplayName: String
        get() {
            val fbName = auth?.currentUser?.displayName
            if (!fbName.isNullOrBlank()) return fbName
            val localName = activeProfile?.displayName
            if (!localName.isNullOrBlank()) return localName
            return if (isDemoMode) "Guest Researcher" else "Researcher"
        }

    val userInstitution: String
        get() {
            return activeProfile?.institution?.ifBlank { "Genomics Research Institute" }
                ?: "Genomics Research Institute"
        }

    /**
     * Authenticate user with email and password.
     * Tries Firebase Auth first; if Firebase fails (due to network or API key configuration),
     * validates against local registered accounts just like the Web app's AuthContext.
     */
    suspend fun signIn(email: String, pass: String): Result<UserProfile> {
        isDemoMode = false
        val cleanEmail = email.lowercase().trim()

        // 1. Attempt real Firebase Auth
        try {
            val fbAuth = auth
            if (fbAuth != null) {
                val authResult = fbAuth.signInWithEmailAndPassword(cleanEmail, pass).await()
                val user = authResult.user
                if (user != null) {
                    val profile = UserProfile(
                        uid = user.uid,
                        email = user.email ?: cleanEmail,
                        displayName = user.displayName ?: cleanEmail.substringBefore("@"),
                        institution = memoryAccounts[cleanEmail]?.institution ?: "Genomics Research Institute"
                    )
                    activeProfile = profile
                    persistSession(profile)
                    return Result.success(profile)
                }
            }
        } catch (e: Exception) {
            // Firebase rejected or offline. Check local storage.
        }

        // 2. Fallback to Local Persistent Account Store
        val stored = memoryAccounts[cleanEmail]
        if (stored != null) {
            if (stored.password == pass) {
                val profile = UserProfile(
                    uid = stored.uid,
                    email = stored.email,
                    displayName = stored.displayName,
                    institution = stored.institution
                )
                activeProfile = profile
                persistSession(profile)
                return Result.success(profile)
            } else {
                return Result.failure(Exception("Invalid password. Please check your credentials and try again."))
            }
        }

        return Result.failure(Exception("Account is not registered. Please tap 'Create Account' above to register."))
    }

    /**
     * Create researcher account.
     * Tries Firebase Auth first. If Firebase Auth is restricted or offline,
     * seamlessly creates and persists the researcher account locally and logs in immediately!
     */
    suspend fun signUp(
        email: String,
        pass: String,
        name: String = "",
        institution: String = ""
    ): Result<UserProfile> {
        isDemoMode = false
        val cleanEmail = email.lowercase().trim()
        val displayName = if (name.isNotBlank()) name.trim() else cleanEmail.substringBefore("@")
        val safeInstitution = if (institution.isNotBlank()) institution.trim() else "Genomics Research Institute"

        var assignedUid = "usr-${System.currentTimeMillis()}"

        // 1. Attempt real Firebase Auth creation
        try {
            val fbAuth = auth
            if (fbAuth != null) {
                val authResult = fbAuth.createUserWithEmailAndPassword(cleanEmail, pass).await()
                val user = authResult.user
                if (user != null) {
                    assignedUid = user.uid
                    try {
                        val profileUpdate = UserProfileChangeRequest.Builder()
                            .setDisplayName(displayName)
                            .build()
                        user.updateProfile(profileUpdate).await()
                    } catch (e: Exception) {
                        // Non-critical profile update failure
                    }
                }
            }
        } catch (e: Exception) {
            // Firebase Auth registration encountered error (e.g. API key restriction or offline).
            // Proceed gracefully with local persistent registration just like Web app!
        }

        // 2. Save account in local persistent registry
        val account = LocalStoredAccount(
            uid = assignedUid,
            email = cleanEmail,
            password = pass,
            displayName = displayName,
            institution = safeInstitution
        )
        memoryAccounts[cleanEmail] = account
        persistAccounts()

        // 3. Immediately log the user in
        val profile = UserProfile(
            uid = assignedUid,
            email = cleanEmail,
            displayName = displayName,
            institution = safeInstitution
        )
        activeProfile = profile
        persistSession(profile)

        return Result.success(profile)
    }

    fun signInAsDemo(): Boolean {
        isDemoMode = true
        activeProfile = UserProfile(
            uid = "demo-researcher-android",
            email = "demo.researcher@biodna.internal",
            displayName = "Guest Researcher",
            institution = "GenomicsAI Demonstration Lab"
        )
        persistSession(activeProfile)
        return true
    }

    fun signOut() {
        isDemoMode = false
        activeProfile = null
        persistSession(null)
        try {
            auth?.signOut()
        } catch (e: Exception) {
            // Ignore
        }
    }

    suspend fun sendPasswordReset(email: String): Result<Unit> {
        val cleanEmail = email.lowercase().trim()
        try {
            val fbAuth = auth
            if (fbAuth != null) {
                fbAuth.sendPasswordResetEmail(cleanEmail).await()
            }
            return Result.success(Unit)
        } catch (e: Exception) {
            // In demo/offline mode, return simulated success
            return Result.success(Unit)
        }
    }

    suspend fun saveAnalysis(record: AnalysisRecord): Result<String> {
        val now = Date()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val isoString = isoFormat.format(now)

        val activeUid = userId
        val activeMail = userEmail

        val prepared = record.copy(
            userId = activeUid.ifEmpty { "demo-local" },
            userEmail = activeMail.ifEmpty { "guest@biodna.internal" },
            timestamp = isoString,
            createdAt = now
        )

        // If Firebase is available and user is logged into Firebase
        val fbUser = auth?.currentUser
        val fbStore = firestore
        if (fbUser != null && fbStore != null && !isDemoMode) {
            return try {
                val docRef = fbStore.collection("users")
                    .document(fbUser.uid)
                    .collection("analyses")
                    .add(prepared)
                    .await()
                Result.success(docRef.id)
            } catch (e: Exception) {
                // If cloud write fails, cache locally
                val localId = "local-${System.currentTimeMillis()}"
                demoAnalyses.add(0, prepared.copy(id = localId))
                Result.success(localId)
            }
        }

        // Local cache
        val localId = "local-${System.currentTimeMillis()}"
        demoAnalyses.add(0, prepared.copy(id = localId))
        return Result.success(localId)
    }

    fun getAnalysesFlow(): Flow<List<AnalysisRecord>> = callbackFlow {
        val fbUser = auth?.currentUser
        val fbStore = firestore

        if (fbUser != null && fbStore != null && !isDemoMode) {
            val listener = fbStore.collection("users")
                .document(fbUser.uid)
                .collection("analyses")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        trySend(demoAnalyses.toList())
                        return@addSnapshotListener
                    }
                    if (snapshot != null) {
                        val list = snapshot.toObjects(AnalysisRecord::class.java)
                        // Merge with local if any
                        val combined = (list + demoAnalyses).distinctBy { it.id }
                        trySend(combined)
                    }
                }
            awaitClose { listener.remove() }
        } else {
            trySend(demoAnalyses.toList())
            awaitClose { }
        }
    }

    suspend fun deleteAnalysis(analysisId: String): Result<Unit> {
        demoAnalyses.removeAll { it.id == analysisId }

        val fbUser = auth?.currentUser
        val fbStore = firestore
        if (fbUser != null && fbStore != null && !isDemoMode) {
            return try {
                fbStore.collection("users")
                    .document(fbUser.uid)
                    .collection("analyses")
                    .document(analysisId)
                    .delete()
                    .await()
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
        return Result.success(Unit)
    }
}
