package com.biotech.dnadetect.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.biotech.dnadetect.domain.AlignmentResult
import com.biotech.dnadetect.domain.KmpResult
import com.biotech.dnadetect.domain.SuffixArrayResult
import java.io.BufferedReader
import java.io.InputStreamReader

object FileUtils {

    /**
     * Reads text content from a content:// or file:// URI selected via Storage Access Framework
     */
    fun readTextFromUri(context: Context, uri: Uri): String {
        return try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                BufferedReader(InputStreamReader(inputStream)).use { reader ->
                    reader.readText()
                }
            } ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * Generates a standard CSV report from Alignment & Mutation Detection results
     */
    fun generateMutationCsv(alignment: AlignmentResult): String {
        val sb = StringBuilder()
        sb.append("Variant #,Type,Sub-Type,Local Position,CDS Position,Ref Base,Alt Base,HGVS Notation,Description\n")
        alignment.mutations.forEachIndexed { index, m ->
            val num = index + 1
            val type = m.type.name
            val sub = m.subType?.name ?: "N/A"
            val pos = m.position
            val cds = m.cdsPosition ?: pos
            val ref = m.refBase
            val alt = m.altBase
            val hgvs = "\"${m.hgvs}\""
            val desc = "\"${m.description.replace("\"", "\"\"")}\""
            sb.append("$num,$type,$sub,$pos,$cds,$ref,$alt,$hgvs,$desc\n")
        }
        return sb.toString()
    }

    /**
     * Generates a plain-text scientific summary report
     */
    fun generateTextReport(alignment: AlignmentResult): String {
        val sb = StringBuilder()
        sb.append("=======================================================\n")
        sb.append(" GenomicsAI: Pairwise DNA Alignment & Mutation Report\n")
        sb.append("=======================================================\n\n")
        sb.append("Reference: ${alignment.refName}\n")
        sb.append("Query Sample: ${alignment.altName}\n")
        sb.append("Alignment Score: ${alignment.score}\n")
        sb.append("Sequence Identity: ${alignment.identityPercent}%\n")
        sb.append("Total Alignment Columns: ${alignment.alignmentLength}\n")
        sb.append("Matches: ${alignment.matchesCount} | Mismatches: ${alignment.mismatchesCount} | Gaps: ${alignment.gapsCount}\n")
        sb.append("Total Variants Identified: ${alignment.mutations.size} (SNPs: ${alignment.snpCount}, Ins: ${alignment.insertionCount}, Del: ${alignment.deletionCount})\n\n")

        sb.append("---------------- VARIANT DETAILS ----------------\n")
        if (alignment.mutations.isEmpty()) {
            sb.append("No sequence variants detected. 100% identity match.\n")
        } else {
            alignment.mutations.forEachIndexed { i, m ->
                sb.append("${i + 1}. [${m.type}] Position ${m.position} (CDS ${m.cdsPosition ?: m.position}): ${m.hgvs}\n")
                sb.append("   ${m.description}\n")
                if (m.flanking5Prime.isNotEmpty() || m.flanking3Prime.isNotEmpty()) {
                    sb.append("   Flanking Context: 5'-${m.flanking5Prime}[${m.refBase}/${m.altBase}]${m.flanking3Prime}-3'\n")
                }
            }
        }
        sb.append("\n=======================================================\n")
        return sb.toString()
    }

    /**
     * Launches Android's native Share Sheet to export reports to any app (Files, Gmail, Drive, etc.)
     */
    fun shareTextContent(context: Context, title: String, content: String) {
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TITLE, title)
            putExtra(Intent.EXTRA_SUBJECT, title)
            putExtra(Intent.EXTRA_TEXT, content)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Export $title")
        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(shareIntent)
    }
}

