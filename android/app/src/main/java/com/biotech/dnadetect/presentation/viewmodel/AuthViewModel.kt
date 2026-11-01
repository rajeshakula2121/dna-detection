package com.biotech.dnadetect.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.biotech.dnadetect.data.repository.FirebaseRepository
import com.biotech.dnadetect.data.repository.UserProfile
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val repository: FirebaseRepository = FirebaseRepository()
) : ViewModel() {

    val currentUser: FirebaseUser?
        get() = repository.currentUser

    private val _authState = MutableStateFlow<UiState<UserProfile?>>(UiState.Idle)
    val authState: StateFlow<UiState<UserProfile?>> = _authState.asStateFlow()

    private val _resetState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val resetState: StateFlow<UiState<String>> = _resetState.asStateFlow()

    init {
        if (repository.isUserLoggedIn) {
            val profile = UserProfile(
                uid = repository.userId,
                email = repository.userEmail,
                displayName = repository.userDisplayName,
                institution = repository.userInstitution
            )
            _authState.value = UiState.Success(profile)
        }
    }

    fun clearError() {
        if (_authState.value is UiState.Error) {
            _authState.value = UiState.Idle
        }
        if (_resetState.value is UiState.Error) {
            _resetState.value = UiState.Idle
        }
    }

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _authState.value = UiState.Error("Please enter both email and password.")
            return
        }

        viewModelScope.launch {
            _authState.value = UiState.Loading
            val result = repository.signIn(email.trim(), pass)
            result.onSuccess { profile ->
                _authState.value = UiState.Success(profile)
            }.onFailure { err ->
                _authState.value = UiState.Error(err.localizedMessage ?: "Invalid email or password. Please verify and try again.")
            }
        }
    }

    fun register(
        email: String,
        pass: String,
        confirmPass: String,
        name: String = "",
        institution: String = "",
        agreedTerms: Boolean = true
    ) {
        if (email.isBlank() || pass.isBlank() || confirmPass.isBlank()) {
            _authState.value = UiState.Error("Please fill in all mandatory fields.")
            return
        }
        if (pass.length < 6) {
            _authState.value = UiState.Error("Password must be at least 6 characters long.")
            return
        }
        if (pass != confirmPass) {
            _authState.value = UiState.Error("Passwords do not match. Please verify.")
            return
        }
        if (!agreedTerms) {
            _authState.value = UiState.Error("Please accept the research and data usage terms.")
            return
        }

        viewModelScope.launch {
            _authState.value = UiState.Loading
            val result = repository.signUp(
                email = email.trim(),
                pass = pass,
                name = name.trim(),
                institution = institution.trim()
            )
            result.onSuccess { profile ->
                _authState.value = UiState.Success(profile)
            }.onFailure { err ->
                _authState.value = UiState.Error(err.localizedMessage ?: "Registration failed. Please try again.")
            }
        }
    }

    fun sendPasswordReset(email: String) {
        if (email.isBlank()) {
            _resetState.value = UiState.Error("Please enter your email address to receive password reset link.")
            return
        }

        viewModelScope.launch {
            _resetState.value = UiState.Loading
            val result = repository.sendPasswordReset(email.trim())
            result.onSuccess {
                _resetState.value = UiState.Success("Password reset instructions sent to $email.")
            }.onFailure { err ->
                _resetState.value = UiState.Error(err.localizedMessage ?: "Failed to send reset link.")
            }
        }
    }

    fun signInAsDemo() {
        repository.signInAsDemo()
        val demoProfile = UserProfile(
            uid = repository.userId,
            email = repository.userEmail,
            displayName = repository.userDisplayName,
            institution = repository.userInstitution
        )
        _authState.value = UiState.Success(demoProfile)
    }

    val isUserLoggedIn: Boolean
        get() = repository.isUserLoggedIn

    val userDisplayEmail: String
        get() = repository.userEmail

    val userDisplayId: String
        get() = repository.userId

    val userDisplayName: String
        get() = repository.userDisplayName

    val userInstitution: String
        get() = repository.userInstitution

    fun signOut() {
        repository.signOut()
        _authState.value = UiState.Idle
        _resetState.value = UiState.Idle
    }
}
