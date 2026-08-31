package com.nulljosh.talli

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DashboardParserTest {

    @Test
    fun parsesLegacyStringMessages() {
        val d = DashboardParser.parse(
            """{"payment_amount":"${'$'}1,483.42","next_date":"2026-09-23","messages":["Cheque issued",""]}"""
        )
        assertEquals("${'$'}1,483.42", d.paymentAmount)
        assertEquals(1, d.messages.size)
        assertEquals("Cheque issued", d.messages[0].text)
    }

    @Test
    fun parsesObjectMessagesAndFallsBackToSubjectBody() {
        val d = DashboardParser.parse(
            """{"messages":[
                {"id":"a","text":"Hi","timestamp":"2026-08-01","actionRequired":true},
                {"id":"b","subject":"Report due","body":"By the 5th","date":"2026-08-02"}
            ]}"""
        )
        assertEquals(listOf("a", "b"), d.messages.map { it.id })
        assertTrue(d.messages[0].actionRequired)
        assertEquals("Report due - By the 5th", d.messages[1].text)
        assertEquals("2026-08-02", d.messages[1].timestamp)
    }

    @Test
    fun toleratesMissingAndNullFields() {
        val d = DashboardParser.parse(
            """{"payment_amount":null,"income":{"pwdMonthly":1483.5,"cdbMonthly":200.0,"totalMonthly":1683.5}}"""
        )
        assertNull(d.paymentAmount)
        assertEquals(emptyList(), d.messages)
        assertEquals(1683.5, d.income?.totalMonthly)
    }
}
