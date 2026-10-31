package com.biotech.dnadetect.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.biotech.dnadetect.data.repository.FirebaseRepository
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

    private val _authState = MutableStateFlow<UiState<FirebaseUser?>>(UiState.Idle)
    val authState: StateFlow<UiState<FirebaseUser?>> = _authState.asStateFlow()

    private val _resetState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val resetState: StateFlow<UiState<String>> = _resetState.asStateFlow()

    init {
        val user = repository.currentUser
        if (user != null) {
            _authState.value = UiState.Success(user)
        }
    }

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _authState.value = UiState.Error("Please enter email and password")
            return
        }

        viewModelScope.launch {
            _authState.value = UiState.Loading
            val result = repository.signIn(email.trim(), pass)
            result.onSuccess { user ->
                _authState.value = UiState.Success(user)
            }.onFailure { err ->
                _authState.value = UiState.Error(err.localizedMessage ?: "Login failed")
            }
        }
    }

    fun register(email: String, pass: String, confirmPass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _authState.value = UiState.Error("Please fill all required fields")
            return
        }
        if (pass.length < 6) {
            _authState.value = UiState.Error("Password must be at least 6 characters")
            return
        }
        if (pass != confirmPass) {
            _authState.value = UiState.Error("Passwords do not match")
            return
        }

        viewModelScope.launch {
            _authState.value = UiState.Loading
            val result = repository.signUp(email.trim(), pass)
            result.onSuccess { user ->
                _authState.value = UiState.Success(user)
            }.onFailure { err ->
                _authState.value = UiState.Error(err.localizedMessage ?: "Registration failed")
            }
        }
    }

    fun sendPasswordReset(email: String) {
        if (email.isBlank()) {
            _resetState.value = UiState.Error("Please enter your registered email")
            return
        }

        viewModelScope.launch {
            _resetState.value = UiState.Loading
            val result = repository.sendPasswordReset(email.trim())
            result.onSuccess {
                _resetState.value = UiState.Success("Password reset link sent to $email")
            }.onFailure { err ->
                _resetState.value = UiState.Error(err.localizedMessage ?: "Reset failed")
            }
        }
    }

    fun signInAsDemo() {
        repository.signInAsDemo()
        _authState.value = UiState.Success(null)
    }

    val isUserLoggedIn: Boolean
        get() = repository.isUserLoggedIn

    val userDisplayEmail: String
        get() = repository.userEmail

    val userDisplayId: String
        get() = repository.userId

    fun signOut() {
        repository.signOut()
        _authState.value = UiState.Idle
    }
}

