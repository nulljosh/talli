package com.nulljosh.talli

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class StatusMessage(
    val id: String,
    val text: String,
    val timestamp: String?,
    val actionRequired: Boolean,
)

/** Derived server-side by deriveIncome() in src/programs/profiles.js so no client re-derives it. */
data class Income(
    val pwdMonthly: Double,
    val cdbMonthly: Double,
    val totalMonthly: Double,
)

data class Dashboard(
    val paymentAmount: String?,
    val nextDate: String?,
    val messages: List<StatusMessage>,
    val income: Income?,
)

/**
 * Hand-rolled because `messages` is polymorphic on the wire: older servers send
 * ["text", ...], newer ones send [{id, subject, body, ...}]. Same fallback chain as
 * DashboardData.init(from:) in ios/Models/DashboardData.swift -- the two must agree.
 */
object DashboardParser {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    fun parse(body: String): Dashboard {
        val root = json.parseToJsonElement(body).jsonObject
        return Dashboard(
            paymentAmount = root.str("payment_amount"),
            nextDate = root.str("next_date"),
            messages = messages(root["messages"]),
            income = (root["income"] as? JsonObject)?.let {
                Income(
                    pwdMonthly = it.num("pwdMonthly") ?: 0.0,
                    cdbMonthly = it.num("cdbMonthly") ?: 0.0,
                    totalMonthly = it.num("totalMonthly") ?: 0.0,
                )
            },
        )
    }

    private fun messages(element: JsonElement?): List<StatusMessage> {
        val array = element as? JsonArray ?: return emptyList()
        return array.mapIndexedNotNull { index, item ->
            when (item) {
                is JsonPrimitive -> item.contentOrEmpty().takeIf { it.isNotEmpty() }
                    ?.let { StatusMessage("msg-$index", it, null, false) }
                is JsonObject -> {
                    val text = item.str("text")
                        ?: listOfNotNull(item.str("subject"), item.str("body")).joinToString(" - ")
                    text.takeIf { it.isNotEmpty() }?.let {
                        StatusMessage(
                            id = item.str("id") ?: "msg-$index",
                            text = it,
                            timestamp = item.str("timestamp") ?: item.str("date"),
                            actionRequired = item["actionRequired"]?.jsonPrimitive?.booleanOrNull ?: false,
                        )
                    }
                }
                else -> null
            }
        }
    }

    private fun JsonObject.str(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf { !it.isNullLiteral() }?.content?.takeIf { it.isNotEmpty() }

    private fun JsonObject.num(key: String): Double? = (this[key] as? JsonPrimitive)?.doubleOrNull

    private fun JsonPrimitive.isNullLiteral() = !isString && content == "null"

    private fun JsonPrimitive.contentOrEmpty() = if (isNullLiteral()) "" else content
}
