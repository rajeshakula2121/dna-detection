package com.biotech.dnadetect.presentation.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biotech.dnadetect.presentation.viewmodel.AuthViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState

@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    onAuthSuccess: () -> Unit
) {
    var isRegisterMode by remember { mutableStateOf(false) }

    // Form inputs
    var displayName by remember { mutableStateOf("") }
    var institution by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(true) }
    var agreedTerms by remember { mutableStateOf(true) }
    var showForgot by remember { mutableStateOf(false) }

    val authState by viewModel.authState.collectAsState()
    val resetState by viewModel.resetState.collectAsState()
    val scrollState = rememberScrollState()

    // Automatically navigate on authentication success
    LaunchedEffect(authState) {
        if (authState is UiState.Success && viewModel.isUserLoggedIn) {
            onAuthSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)) // Match web bg-slate-50
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // ======================== BRAND HEADER ========================
            // Circular Navy badge with teal glowing border
            Surface(
                modifier = Modifier.size(56.dp),
                shape = CircleShape,
                color = Color(0xFF0B132B),
                border = BorderStroke(2.dp, Color(0xFF2DD4BF)),
                shadowElevation = 6.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Biotech,
                        contentDescription = "GenomicsAI Icon",
                        tint = Color(0xFF2DD4BF),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Title: GenomicsAI
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Genomics",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF0F172A),
                    letterSpacing = (-0.5).sp
                )
                Text(
                    text = "AI",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF0D9488),
                    letterSpacing = (-0.5).sp
                )
            }

            // Category Subtitle
            Text(
                text = "BIOINFORMATICS ANALYSIS PLATFORM",
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF0D9488),
                letterSpacing = 2.sp,
                modifier = Modifier.padding(top = 2.dp)
            )

            // Dynamic Description
            Text(
                text = if (isRegisterMode) {
                    "Create a researcher workspace to store sequence pipelines and variant findings."
                } else {
                    "Sign in to access your genomic sequence repository and analysis pipelines."
                },
                fontSize = 12.sp,
                color = Color(0xFF64748B),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .padding(horizontal = 24.dp, vertical = 6.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ======================== AUTH CARD ========================
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(22.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Segmented Mode Switcher (Pill Tabs)
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF1F5F9),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(4.dp)) {
                            // Sign In Tab
                            Surface(
                                shape = RoundedCornerShape(9.dp),
                                color = if (!isRegisterMode) Color.White else Color.Transparent,
                                shadowElevation = if (!isRegisterMode) 1.dp else 0.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(9.dp))
                                    .clickable {
                                        isRegisterMode = false
                                        viewModel.clearError()
                                    }
                            ) {
                                Text(
                                    text = "Sign In",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (!isRegisterMode) Color(0xFF0F766E) else Color(0xFF64748B),
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 9.dp)
                                )
                            }

                            // Create Account Tab
                            Surface(
                                shape = RoundedCornerShape(9.dp),
                                color = if (isRegisterMode) Color.White else Color.Transparent,
                                shadowElevation = if (isRegisterMode) 1.dp else 0.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(9.dp))
                                    .clickable {
                                        isRegisterMode = true
                                        viewModel.clearError()
                                    }
                            ) {
                                Text(
                                    text = "Create Account",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isRegisterMode) Color(0xFF0F766E) else Color(0xFF64748B),
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 9.dp)
                                )
                            }
                        }
                    }

                    // Error Banner (matches web rose-50)
                    if (authState is UiState.Error) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFFFF1F2),
                            border = BorderStroke(1.dp, Color(0xFFFECDD3)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ErrorOutline,
                                    contentDescription = null,
                                    tint = Color(0xFFE11D48),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = (authState as UiState.Error).message,
                                    color = Color(0xFF9F1239),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // Reset Link Success Banner (matches web emerald-50)
                    if (resetState is UiState.Success) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFECFDF5),
                            border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF059669),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = (resetState as UiState.Success).data,
                                    color = Color(0xFF065F46),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // ======================== FORM FIELDS ========================
                    // 1. Researcher Name (Register mode only)
                    if (isRegisterMode) {
                        Column {
                            Text(
                                text = "RESEARCHER NAME",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF334155),
                                letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            OutlinedTextField(
                                value = displayName,
                                onValueChange = { displayName = it },
                                placeholder = { Text("Dr. Jane Doe", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF94A3B8))
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF0D9488),
                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // 2. Institution / Lab
                        Column {
                            Text(
                                text = "INSTITUTION / LAB",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF334155),
                                letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            OutlinedTextField(
                                value = institution,
                                onValueChange = { institution = it },
                                placeholder = { Text("Genomics Research Institute", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.Business, contentDescription = null, tint = Color(0xFF94A3B8))
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF0D9488),
                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 3. Work Email Address
                    Column {
                        Text(
                            text = "WORK EMAIL ADDRESS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF334155),
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            placeholder = { Text("researcher@bioinstitute.edu", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                            leadingIcon = {
                                Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF94A3B8))
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF0D9488),
                                unfocusedBorderColor = Color(0xFFE2E8F0),
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // 4. Password
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "PASSWORD",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF334155),
                                letterSpacing = 0.5.sp
                            )
                            if (!isRegisterMode) {
                                Text(
                                    text = "Forgot password?",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF0D9488),
                                    modifier = Modifier
                                        .clickable { showForgot = !showForgot }
                                        .padding(vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = { Text("••••••••", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                            leadingIcon = {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF94A3B8))
                            },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = "Toggle password visibility",
                                        tint = Color(0xFF94A3B8)
                                    )
                                }
                            },
                            singleLine = true,
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF0D9488),
                                unfocusedBorderColor = Color(0xFFE2E8F0),
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Inline Forgot Password Box
                    AnimatedVisibility(
                        visible = showForgot && !isRegisterMode,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "Enter your email above and tap below to receive a password reset link:",
                                    fontSize = 11.sp,
                                    color = Color(0xFF64748B)
                                )
                                TextButton(
                                    onClick = { viewModel.sendPasswordReset(email) },
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text(
                                        text = "Send Reset Link →",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF0F766E)
                                    )
                                }
                            }
                        }
                    }

                    // 5. Confirm Password (Register mode only)
                    if (isRegisterMode) {
                        Column {
                            Text(
                                text = "CONFIRM PASSWORD",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF334155),
                                letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                placeholder = { Text("••••••••", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF94A3B8))
                                },
                                trailingIcon = {
                                    IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                        Icon(
                                            imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                            contentDescription = "Toggle password visibility",
                                            tint = Color(0xFF94A3B8)
                                        )
                                    }
                                },
                                singleLine = true,
                                visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF0D9488),
                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // Terms Checkbox
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { agreedTerms = !agreedTerms }
                        ) {
                            Checkbox(
                                checked = agreedTerms,
                                onCheckedChange = { agreedTerms = it },
                                colors = CheckboxDefaults.colors(checkedColor = Color(0xFF0D9488))
                            )
                            Text(
                                text = "I agree to the Bioinformatics Research Data Governance & Compliance Terms",
                                fontSize = 11.sp,
                                color = Color(0xFF475569)
                            )
                        }
                    } else {
                        // Remember Workstation Checkbox
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { rememberMe = !rememberMe }
                        ) {
                            Checkbox(
                                checked = rememberMe,
                                onCheckedChange = { rememberMe = it },
                                colors = CheckboxDefaults.colors(checkedColor = Color(0xFF0D9488))
                            )
                            Text(
                                text = "Remember this workstation",
                                fontSize = 12.sp,
                                color = Color(0xFF475569)
                            )
                        }
                    }

                    // ======================== SUBMIT BUTTON ========================
                    Button(
                        onClick = {
                            if (isRegisterMode) {
                                viewModel.register(
                                    email = email,
                                    pass = password,
                                    confirmPass = confirmPassword,
                                    name = displayName,
                                    institution = institution,
                                    agreedTerms = agreedTerms
                                )
                            } else {
                                viewModel.login(email, password)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D9488)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (authState is UiState.Loading) {
                            CircularProgressIndicator(
                                color = Color.White,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isRegisterMode) "Creating workspace..." else "Authenticating...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        } else {
                            Text(
                                text = if (isRegisterMode) "Create Researcher Account  →" else "Sign In to GenomicsAI  →",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ======================== FOOTER SHORTCUTS ========================
            // Guest Researcher quick bypass (identical to web app)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable {
                        viewModel.signInAsDemo()
                    }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "Skip to Dashboard as Guest Researcher",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF0D9488)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = Color(0xFF0D9488),
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "GenomicsAI Platform © 2026. Certified research and bioinformatics analysis.",
                fontSize = 10.sp,
                color = Color(0xFF94A3B8),
                textAlign = TextAlign.Center
            )
        }
    }
}
