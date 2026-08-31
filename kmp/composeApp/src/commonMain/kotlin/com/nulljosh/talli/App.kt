package com.nulljosh.talli

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

private enum class Tab(val label: String) {
    Dashboard("Home"), Benefits("Benefits"), Messages("Messages"), Settings("Settings")
}

@Composable
fun App() {
    val api = remember { TalliApi() }
    val scope = rememberCoroutineScope()

    var signedIn by remember { mutableStateOf(false) }
    var checking by remember { mutableStateOf(true) }
    var dashboard by remember { mutableStateOf<Dashboard?>(null) }
    var readIds by remember { mutableStateOf(emptySet<String>()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf(Tab.Dashboard) }

    suspend fun load(scrape: Boolean) {
        busy = true
        error = null
        try {
            dashboard = if (scrape) {
                val (data, ok) = api.check()
                if (!ok) error = "Live sync failed -- showing the last known data."
                data
            } else {
                api.latest()
            }
            readIds = runCatching { api.readMessages() }.getOrDefault(emptyList()).toSet()
        } catch (e: Throwable) {
            error = e.message ?: "Something went wrong."
        }
        busy = false
    }

    LaunchedEffect(Unit) {
        signedIn = api.sessionCheck()
        if (signedIn) load(scrape = false)
        checking = false
    }

    if (checking) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    if (!signedIn) {
        LoginScreen(busy, error) { user, pass ->
            scope.launch {
                busy = true
                error = api.login(user, pass)
                busy = false
                if (error == null) {
                    signedIn = true
                    load(scrape = true)
                }
            }
        }
        return
    }

    Scaffold(bottomBar = {
        NavigationBar {
            Tab.entries.forEach { t ->
                NavigationBarItem(
                    selected = tab == t,
                    onClick = { tab = t },
                    icon = {},
                    label = { Text(t.label) },
                )
            }
        }
    }) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            }
            when (tab) {
                Tab.Dashboard -> DashboardScreen(dashboard, busy) { scope.launch { load(scrape = true) } }
                Tab.Benefits -> BenefitsScreen(dashboard?.income)
                Tab.Messages -> MessagesScreen(
                    messages = dashboard?.messages.orEmpty(),
                    readIds = readIds,
                    onRead = { id ->
                        if (id !in readIds) scope.launch {
                            val next = (readIds + id).toList()
                            readIds = runCatching { api.markRead(next) }.getOrDefault(next).toSet()
                        }
                    },
                )
                Tab.Settings -> SettingsScreen {
                    scope.launch {
                        api.logout()
                        signedIn = false
                        dashboard = null
                        tab = Tab.Dashboard
                    }
                }
            }
        }
    }
}

@Composable
private fun LoginScreen(busy: Boolean, error: String?, onSubmit: (String, String) -> Unit) {
    var user by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }

    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(Modifier.widthIn(max = 380.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Talli", fontSize = 30.sp, fontWeight = FontWeight.Bold)
            Text("Sign in with your BCeID.", modifier = Modifier.padding(top = 4.dp, bottom = 24.dp))
            OutlinedTextField(
                value = user,
                onValueChange = { user = it },
                label = { Text("BCeID username") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = pass,
                onValueChange = { pass = it },
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                modifier = Modifier.fillMaxWidth(),
            )
            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { onSubmit(user.trim(), pass) },
                enabled = !busy && user.isNotBlank() && pass.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (busy) "Signing in..." else "Sign in") }
            // ponytail: no "remember me" -- storing a BCeID password means a real keystore
            // per platform (EncryptedSharedPreferences / DPAPI / libsecret). Add when the
            // sign-in-every-launch friction is actually a complaint.
            Text(
                "Credentials go to talli.heyitsmejosh.com and are never stored on this device.",
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
    }
}

@Composable
private fun DashboardScreen(data: Dashboard?, busy: Boolean, onRefresh: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
        Text("Next payment", fontSize = 14.sp)
        Text(data?.paymentAmount ?: "--", fontSize = 40.sp, fontWeight = FontWeight.Bold)
        data?.nextDate?.let { Text(it, modifier = Modifier.padding(top = 4.dp)) }

        data?.income?.let { income ->
            Spacer(Modifier.height(28.dp))
            Text("Monthly income", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            AmountRow("Disability assistance (PWD)", income.pwdMonthly)
            AmountRow("Canada Disability Benefit", income.cdbMonthly)
            HorizontalDivider(Modifier.padding(vertical = 8.dp))
            AmountRow("Total", income.totalMonthly)
        }

        Spacer(Modifier.height(28.dp))
        Button(onClick = onRefresh, enabled = !busy) { Text(if (busy) "Syncing..." else "Sync now") }
    }
}

@Composable
private fun AmountRow(label: String, amount: Double) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label)
        Text(formatMoney(amount), fontWeight = FontWeight.Medium)
    }
}

/** Two decimals without java.text, so desktop and Android share one code path. */
private fun formatMoney(value: Double): String {
    val cents = kotlin.math.round(value * 100).toLong()
    return "$${cents / 100}.${(cents % 100).toString().padStart(2, '0')}"
}

@Composable
private fun BenefitsScreen(income: Income?) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
        Text("Active Benefits", fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        income?.let {
            BenefitRow("Disability Assistance (PWD)", formatMoney(it.pwdMonthly) + "/mo", "Automatic")
            BenefitRow("Canada Disability Benefit", formatMoney(it.cdbMonthly) + "/mo", "Automatic")
        }
        BenefitRow("GST/HST Credit", "Quarterly", "Automatic")
        BenefitRow("BC Renter's Tax Credit", "$400/yr max", "Claim on return")
        BenefitRow("Canada Workers Benefit", "$1,633/yr single", "Claim on return")
        BenefitRow("Canadian Dental Care Plan", "Free under $70K", "Application required")
    }
}

@Composable
private fun BenefitRow(title: String, amount: String, how: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Column {
            Text(title, fontWeight = FontWeight.Medium)
            Text(how, fontSize = 12.sp)
        }
        Text(amount, fontWeight = FontWeight.SemiBold)
    }
    HorizontalDivider()
}

@Composable
private fun MessagesScreen(messages: List<StatusMessage>, readIds: Set<String>, onRead: (String) -> Unit) {
    var expanded by remember { mutableStateOf<String?>(null) }

    if (messages.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No messages") }
        return
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        messages.forEach { message ->
            val isRead = message.id in readIds
            Column(
                Modifier.fillMaxWidth()
                    .clickable {
                        expanded = if (expanded == message.id) null else message.id
                        onRead(message.id)
                    }
                    .background(if (isRead) Color.Transparent else MaterialTheme.colorScheme.surfaceVariant)
                    .padding(16.dp)
            ) {
                Text(
                    message.text,
                    fontWeight = if (isRead) FontWeight.Normal else FontWeight.SemiBold,
                    maxLines = if (expanded == message.id) Int.MAX_VALUE else 2,
                )
                message.timestamp?.let { Text(it, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp)) }
                if (message.actionRequired) {
                    Text("Action required", fontSize = 12.sp, color = MaterialTheme.colorScheme.error)
                }
            }
            HorizontalDivider()
        }
    }
}

@Composable
private fun SettingsScreen(onSignOut: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("Settings", fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))
        Text("Talli 3.5.13")
        Text("talli.heyitsmejosh.com", fontSize = 12.sp)
        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onSignOut) { Text("Sign out") }
    }
}
