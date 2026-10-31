package com.biotech.dnadetect.data.repository

import com.biotech.dnadetect.data.model.AnalysisRecord
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FirebaseRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    // In-memory cache for demo/guest mode
    private val demoAnalyses = mutableListOf<AnalysisRecord>()

    private var isDemoSession = false

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    val isUserLoggedIn: Boolean
        get() = auth.currentUser != null || isDemoSession

    val userEmail: String
        get() = if (isDemoSession) "demo.researcher@biodna.internal" else (auth.currentUser?.email ?: "")

    val userId: String
        get() = if (isDemoSession) "demo-researcher-android" else (auth.currentUser?.uid ?: "")

    suspend fun signIn(email: String, pass: String): Result<FirebaseUser> {
        isDemoSession = false
        return try {
            val result = auth.signInWithEmailAndPassword(email.trim(), pass).await()
            result.user?.let { Result.success(it) } ?: Result.failure(Exception("User not found"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUp(email: String, pass: String): Result<FirebaseUser> {
        isDemoSession = false
        return try {
            val result = auth.createUserWithEmailAndPassword(email.trim(), pass).await()
            result.user?.let { Result.success(it) } ?: Result.failure(Exception("Registration failed"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun signInAsDemo(): Boolean {
        isDemoSession = true
        return true
    }

    fun signOut() {
        isDemoSession = false
        auth.signOut()
    }

    suspend fun sendPasswordReset(email: String): Result<Unit> {
        return try {
            auth.sendPasswordResetEmail(email.trim()).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveAnalysis(record: AnalysisRecord): Result<String> {
        val now = Date()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val isoString = isoFormat.format(now)

        if (isDemoSession || auth.currentUser == null) {
            val demoId = "demo-${System.currentTimeMillis()}"
            val prepared = record.copy(
                id = demoId,
                userId = userId,
                userEmail = userEmail,
                timestamp = isoString,
                createdAt = now
            )
            demoAnalyses.add(0, prepared)
            return Result.success(demoId)
        }

        val uid = auth.currentUser?.uid ?: return Result.failure(Exception("User not authenticated"))

        return try {
            val prepared = record.copy(
                userId = uid,
                userEmail = auth.currentUser?.email ?: "",
                timestamp = isoString
            )
            val docRef = firestore.collection("users")
                .document(uid)
                .collection("analyses")
                .add(prepared)
                .await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getAnalysesFlow(): Flow<List<AnalysisRecord>> = callbackFlow {
        if (isDemoSession) {
            trySend(demoAnalyses.toList())
            awaitClose { }
            return@callbackFlow
        }

        val uid = auth.currentUser?.uid
        if (uid == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("users")
            .document(uid)
            .collection("analyses")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val list = snapshot.toObjects(AnalysisRecord::class.java)
                    trySend(list)
                }
            }

        awaitClose { listener.remove() }
    }

    suspend fun deleteAnalysis(analysisId: String): Result<Unit> {
        if (isDemoSession) {
            demoAnalyses.removeAll { it.id == analysisId }
            return Result.success(Unit)
        }

        val uid = auth.currentUser?.uid ?: return Result.failure(Exception("User not authenticated"))
        return try {
            firestore.collection("users")
                .document(uid)
                .collection("analyses")
                .document(analysisId)
                .delete()
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun eToString(e: Exception): String = e.localizedMessage ?: "Unknown error"
}
