package com.nulljosh.talli

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.cookies.HttpCookies
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class TalliApiException(message: String) : Exception(message)

/**
 * Straight translation of ios/API/APIClient.swift against the same /api contract.
 * Auth is the session cookie the Worker sets, so HttpCookies does here what
 * URLSession's shared cookie storage does on Apple.
 */
class TalliApi(
    private val baseUrl: String = "https://talli.heyitsmejosh.com",
    private val http: HttpClient = defaultClient(),
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true; isLenient = true }

        fun defaultClient(): HttpClient = HttpClient {
            install(HttpCookies)
            install(HttpTimeout) {
                // /api/mobile blocks on a cold-cache portal scrape; the server allows 45s.
                requestTimeoutMillis = 60_000
                connectTimeoutMillis = 15_000
            }
        }
    }

    @Serializable private data class LoginRequest(val username: String, val password: String)
    @Serializable private data class LoginResponse(val success: Boolean = false, val error: String? = null)
    @Serializable private data class ReadMessagesRequest(val readIds: List<String>)
    @Serializable private data class ReadMessagesResponse(val readIds: List<String> = emptyList())

    /** Returns null on success, the server's message on failure. */
    suspend fun login(username: String, password: String): String? {
        val res = http.post("$baseUrl/api/login") {
            contentType(ContentType.Application.Json)
            header("Accept", "application/json")
            setBody(json.encodeToString(LoginRequest.serializer(), LoginRequest(username, password)))
        }
        val decoded = runCatching {
            json.decodeFromString(LoginResponse.serializer(), res.bodyAsText())
        }.getOrNull() ?: return "Invalid response from server."
        return if (decoded.success) null else (decoded.error ?: "Sign-in failed.")
    }

    suspend fun sessionCheck(): Boolean =
        runCatching { http.get("$baseUrl/api/session-check").status.value == 200 }.getOrDefault(false)

    suspend fun logout() {
        runCatching { http.post("$baseUrl/api/logout") }
    }

    suspend fun latest(): Dashboard = DashboardParser.parse(getOrThrow("/api/mobile"))

    /**
     * A failed scrape must not hide the dashboard, but the caller still needs to know it
     * failed -- that is how a wedged 429 went unnoticed for months.
     */
    suspend fun check(): Pair<Dashboard, Boolean> {
        val scraped = runCatching { getOrThrow("/api/check") }.isSuccess
        return latest() to scraped
    }

    suspend fun readMessages(): List<String> =
        json.decodeFromString(ReadMessagesResponse.serializer(), getOrThrow("/api/read-messages")).readIds

    suspend fun markRead(ids: List<String>): List<String> {
        val res = http.post("$baseUrl/api/read-messages") {
            contentType(ContentType.Application.Json)
            setBody(json.encodeToString(ReadMessagesRequest.serializer(), ReadMessagesRequest(ids)))
        }
        return json.decodeFromString(ReadMessagesResponse.serializer(), checked(res)).readIds
    }

    private suspend fun getOrThrow(path: String): String = checked(
        http.get("$baseUrl$path") { header("Accept", "application/json") }
    )

    private suspend fun checked(res: HttpResponse): String = when (res.status.value) {
        in 200..299 -> res.bodyAsText()
        401 -> throw TalliApiException("Session expired. Please sign in again.")
        429 -> throw TalliApiException("Too many sign-in attempts. Wait 15 minutes and try again.")
        else -> throw TalliApiException("Server error (${res.status.value}).")
    }
}
