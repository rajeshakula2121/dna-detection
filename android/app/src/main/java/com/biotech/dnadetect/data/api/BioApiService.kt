package com.biotech.dnadetect.data.api

import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient

// ======================== API REQUEST & RESPONSE MODELS ========================

data class HealthResponse(
    val status: String,
    val service: String,
    val version: String
)

data class ApiPatternRequest(
    val sequence: String,
    val motif: String = "TATA"
)

data class ApiPatternResponse(
    val sequenceLength: Int,
    val gcContent: Double,
    val atContent: Double,
    val gcSkew: Double,
    val atSkew: Double,
    val kmpResult: Any?,
    val boyerMooreResult: Any?,
    val suffixArrayResult: Any?,
    val kmerResult: Any?
)

data class ApiMutationRequest(
    val query_sequence: String,
    val reference_sequence: String,
    val match_score: Int = 2,
    val mismatch_penalty: Int = -1,
    val gap_penalty: Int = -2
)

data class ApiMutationItem(
    val position: Int,
    val refPosition: Int,
    val altPosition: Int?,
    val refBase: String,
    val altBase: String,
    val mutationType: String,
    val subType: String?,
    val hgvs: String?,
    val description: String?
)

data class ApiMutationResponse(
    val queryName: String?,
    val referenceName: String?,
    val refLength: Int,
    val altLength: Int,
    val alignmentScore: Int,
    val identity: Double,
    val similarity: Double,
    val gapsCount: Int,
    val matchesCount: Int,
    val mismatchesCount: Int,
    val mutationCount: Int,
    val snpCount: Int,
    val insertionCount: Int,
    val deletionCount: Int,
    val refAligned: String,
    val altAligned: String,
    val matchString: String,
    val mutations: List<ApiMutationItem>
)

data class ApiSampleItem(
    val id: String,
    val name: String,
    val organism: String?,
    val sample_type: String,
    val sequence: String,
    val length: Int,
    val gc_content: Double,
    val description: String?
)

data class ApiBenchmarkItem(
    val id: String,
    val gene_symbol: String,
    val clinical_condition: String,
    val ref_accession: String,
    val ref_sequence: String,
    val variant_sequence: String,
    val expected_hgvs: String
)

interface BioApiService {
    @GET("health")
    suspend fun checkHealth(): Response<HealthResponse>

    @POST("api/analysis/pattern")
    suspend fun analyzePattern(@Body request: ApiPatternRequest): Response<ApiPatternResponse>

    @POST("api/analysis/mutations")
    suspend fun detectMutations(@Body request: ApiMutationRequest): Response<ApiMutationResponse>

    @GET("api/samples")
    suspend fun fetchSamples(): Response<List<ApiSampleItem>>

    @GET("api/benchmarks")
    suspend fun fetchBenchmarks(): Response<List<ApiBenchmarkItem>>
}

object BioApiClient {
    // 10.0.2.2 points to host machine localhost in standard Android Emulator
    private var currentBaseUrl = "http://10.0.2.2:8000/"

    private var retrofitInstance: Retrofit? = null
    private var serviceInstance: BioApiService? = null

    val baseUrl: String
        get() = currentBaseUrl

    fun setBaseUrl(newUrl: String) {
        val sanitized = if (newUrl.endsWith("/")) newUrl else "$newUrl/"
        currentBaseUrl = sanitized
        retrofitInstance = null
        serviceInstance = null
    }

    val service: BioApiService
        get() {
            if (serviceInstance == null) {
                val okHttpClient = OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .build()

                retrofitInstance = Retrofit.Builder()
                    .baseUrl(currentBaseUrl)
                    .client(okHttpClient)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()

                serviceInstance = retrofitInstance!!.create(BioApiService::class.java)
            }
            return serviceInstance!!
        }
}
