# ADR-0003: Editable display names for diarized speakers

Status: accepted (2026-09-01)

The transcription UI displays a per-record speaker editor when diarization metadata is present. It replaces only `[SPEAKER_nn]` labels in the rendered text, while the stored transcript keeps canonical labels. Saving uses the authenticated BFF endpoint, so a user can edit only their own transcription.
