"""
Production Architecture — Resume-Job Recommendation System
===========================================================

This file outlines the complete production pipeline for your GraphSAGE
recommendation system, covering training, embedding storage, serving,
and online updates for new users/jobs.
"""

# ==============================================================================
# PHASE 1: OFFLINE TRAINING (run daily/weekly or when graph changes)
# ==============================================================================

"""
1. Load the updated graph (all users, all jobs, all edges)
2. Run full-graph GraphSAGE forward pass to get embeddings
3. Save ALL embeddings to a database (PostgreSQL, Redis, or a file)
4. Save the trained model weights (for fine-tuning new nodes later)

Example output table: embeddings
| node_id | node_type | embedding (float[768]) | updated_at |
|---------|-----------|-----------------------|------------|
| 0       | resume    | [0.12, -0.34, ...]    | 2026-05-07 |
| 5001    | job       | [0.56, 0.78, ...]     | 2026-05-07 |
"""

# ==============================================================================
# PHASE 2: SERVING RECOMMENDATIONS (NO GRAPH NEEDED)
# ==============================================================================

"""
When a user asks for job recommendations:

1. Load the user's pre-computed embedding from the database
2. Load all job embeddings from the database
3. Compute cosine similarity between user embedding and all job embeddings
4. Filter out jobs the user has already applied to (from application history)
5. Return top-K jobs

Time complexity: O(num_jobs × embedding_dim) = O(5000 × 768) per query
This takes < 1ms on CPU, < 0.1ms on GPU.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def serve_recommendations(
    user_embedding,      # (768,) numpy array or tensor
    job_embeddings,      # (num_jobs, 768) numpy array
    applied_job_ids,     # set of job IDs the user already applied to
    top_k=25
):
    """
    Serve top-K job recommendations for a user.
    NO graph is needed here.
    """
    # Compute similarity between user and ALL jobs
    user_vec = user_embedding.reshape(1, -1)  # (1, 768)
    scores = cosine_similarity(user_vec, job_embeddings)[0]  # (num_jobs,)

    # Mask already-applied jobs
    scores[list(applied_job_ids)] = -np.inf

    # Get top-K
    top_k_indices = np.argsort(scores)[::-1][:top_k]
    top_k_scores = scores[top_k_indices]

    return top_k_indices, top_k_scores


# ==============================================================================
# PHASE 3: WHAT TO DO WHEN A NEW USER / JOB APPEARS
# ==============================================================================

"""
There are 3 cases:
"""


# ------------------------------------------------------------------------------
# CASE A: NEW USER with NO interactions yet (most common for new signups)
# ------------------------------------------------------------------------------

def get_embedding_for_new_user(resume_text, mpnet_model):
    """
    New user has no edges in the graph yet.
    Solution: use their resume text directly with MPNet.
    This embedding is NOT refined by the graph yet — but it's a good baseline.
    """
    # Encode the resume with your fine-tuned MPNet
    embedding = mpnet_model.encode(resume_text)  # (768,)
    embedding = embedding / np.linalg.norm(embedding)  # normalize
    return embedding

# Usage:
#   new_user_embedding = get_embedding_for_new_user(resume_text, mpnet_model)
#   recommendations = serve_recommendations(new_user_embedding, job_embeddings, set())
#   → Only feature-based similarity until they have interactions


# ------------------------------------------------------------------------------
# CASE B: NEW USER with a FEW interactions (they applied to 3 jobs)
# ------------------------------------------------------------------------------

def get_embedding_for_user_with_history(
    user_resume_text,    # their resume
    applied_job_ids,     # IDs of jobs they applied to
    applied_job_embeddings,  # pre-computed job embeddings from DB
    alpha=0.5            # how much to weight graph vs feature
):
    """
    New user has a few interactions — we can use the graph signal.
    Combine their feature embedding with the average of their connected jobs.
    """
    # Feature-based embedding (from resume text)
    feature_emb = mpnet_model.encode(user_resume_text)

    # Graph-based embedding (average of connected jobs)
    if len(applied_job_embeddings) > 0:
        graph_emb = np.mean(applied_job_embeddings, axis=0)
    else:
        graph_emb = feature_emb

    # Blend: as they get more interactions, lean more on graph signal
    combined_emb = alpha * feature_emb + (1 - alpha) * graph_emb
    combined_emb = combined_emb / np.linalg.norm(combined_emb)
    return combined_emb


# ------------------------------------------------------------------------------
# CASE C: NEW JOB posted (no interactions yet)
# ------------------------------------------------------------------------------

def get_embedding_for_new_job(job_description_text, mpnet_model):
    """
    New job has no edges yet.
    Use its description with MPNet directly.
    """
    embedding = mpnet_model.encode(job_description_text)
    embedding = embedding / np.linalg.norm(embedding)
    return embedding


# ==============================================================================
# PHASE 4: PERIODIC BATCH RETRAINING
# ==============================================================================

"""
Schedule: run once per day (or per week), during off-peak hours.
This brings all new users/jobs fully into the graph model.

STEPS:
1. Collect all new edges added since last training
   (from your application database / event log)
2. Collect all new users and new jobs
3. Rebuild the full edge_index with ALL data
4. Re-train GraphSAGE from scratch (or fine-tune from previous weights)
5. Re-compute ALL embeddings via full-graph forward pass
6. Batch-update the embeddings table in your database

Runtime for 12.5K nodes: ~5-10 minutes on a single GPU.
This is completely fine to run nightly.
"""

def retrain_and_update_embeddings():
    """
    Daily/weekly batch retraining job.
    """
    # 1. Load fresh data
    # all_users, all_jobs, all_edges = load_from_database()

    # 2. Rebuild graph
    # x_features = build_feature_matrix(all_users, all_jobs, mpnet_model)
    # edge_index = build_edge_index(all_edges)

    # 3. Train GraphSAGE (or load from checkpoint and fine-tune)
    # model = train_graphsage(x_features, edge_index, epochs=100)

    # 4. Full-graph forward pass
    # model.eval()
    # with torch.no_grad():
    #     all_embeddings = model(x_features, edge_index)
    #     all_embeddings = F.normalize(all_embeddings, p=2, dim=1)

    # 5. Save to database
    # update_embeddings_table(all_embeddings, node_ids)

    print("Retraining complete. All embeddings updated.")


# ==============================================================================
# FULL PIPELINE EXAMPLE
# ==============================================================================

def complete_recommendation_pipeline(user_id, top_k=25):
    """
    Full pipeline for serving a recommendation request.
    """
    # Step 1: Look up user embedding from database
    user_embedding = load_embedding_from_db(user_id)  # (768,)

    # Step 2: Load all job embeddings from database
    job_embeddings = load_all_job_embeddings()  # (num_jobs, 768)

    # Step 3: Look up jobs the user already applied to
    applied_jobs = get_applied_job_ids(user_id)  # set of job IDs

    # Step 4: If user is new (no embedding yet), create from features
    if user_embedding is None:
        resume_text = get_user_resume(user_id)
        user_embedding = mpnet_model.encode(resume_text)

    # Step 5: Serve recommendations (NO GRAPH)
    recommended_jobs, scores = serve_recommendations(
        user_embedding, job_embeddings, applied_jobs, top_k
    )

    return recommended_jobs, scores


# ==============================================================================
# SUMMARY: When do you need the graph?
# ==============================================================================

"""
┌─────────────────────────────────────┬───────────────────────────────┐
│ Situation                           │ Graph needed?                 │
├─────────────────────────────────────┼───────────────────────────────┤
│ Training (learning good weights)     │ YES — full graph              │
│ Pre-computing all embeddings        │ YES — full graph forward      │
│ Serving (recommending to a user)    │ NO  — just vector search      │
│ New user with no interactions       │ NO  — use MPNet feature       │
│ New user with some interactions     │ MAYBE — blend feature + graph │
│ New job posted                      │ NO  — use MPNet feature       │
│ Daily batch retraining              │ YES — full graph              │
└─────────────────────────────────────┴───────────────────────────────┘

Bottom line: the graph is ONLY needed for:
  1. Training (once or periodically)
  2. Pre-computing embeddings

At serving time, you only need pre-computed embeddings + cosine similarity.
Full-graph training does NOT make serving slower or more expensive.
"""
