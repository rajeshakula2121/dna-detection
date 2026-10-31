# Baseline & Concurrent Load Test Report

**Target:** GenomicsAI Bioinformatics Platform API  
**Concurrency:** 100 Virtual Users (VUs)  
**Duration:** 1 Minute (60 seconds) continuous execution  
**Date:** 2026-10-31 09:58:32 UTC  

---

## Executive Performance Metrics

| Performance KPI | Measured Benchmark | Target Threshold | Status |
|---|---|---|---|
| **Requests Per Second (RPS)** | **4031.9 req/sec** | > 100 req/sec | PASS |
| **Total Requests Processed** | **21,220 requests** | > 5,000 | PASS |
| **Fastest Response (Min)** | **3.13 ms** | < 100 ms | PASS |
| **Average Response Time** | **23.76 ms** | < 300 ms | PASS |
| **Slowest Response (Max)** | **282.83 ms** | < 2,000 ms | PASS |
| **P95 Latency SLA** | **41.18 ms** | < 500 ms | PASS |
| **Error Rate** | **0.0%** | < 1.0% | PASS |

---

## Per-Endpoint Throughput & Latency Breakdown

| Endpoint | Method | Path | Requests | Avg Latency | P95 Latency | Error Count |
|---|---|---|---|---|---|---|
| Health Probe | `GET` | `/health` | 4317 | 9.44 ms | 9.3 ms | 0 |
| Sample Inventory | `GET` | `/api/samples` | 4331 | 28.34 ms | 37.71 ms | 0 |
| Sequence Validation | `POST` | `/api/v1/sequences/validate` | 4131 | 20.69 ms | 24.91 ms | 0 |
| KMP Motif Search | `POST` | `/api/v1/patterns/kmp` | 4255 | 25.77 ms | 31.81 ms | 0 |
| Dashboard Analytics | `GET` | `/api/analytics/dashboard` | 4186 | 34.79 ms | 44.58 ms | 0 |

---

## Key Performance Insights
1. **System Capacity:** Under 100 concurrent virtual users, the system successfully sustains **4031.9 req/sec** across mixed read and compute endpoints.
2. **Latency Stability:** Average response time remains under **23.76 ms**, with 95% of all calls returning in under **41.18 ms**.
3. **Artifacts:** Full multi-sheet Excel spreadsheet saved to `load-test-summary.xlsx`.
