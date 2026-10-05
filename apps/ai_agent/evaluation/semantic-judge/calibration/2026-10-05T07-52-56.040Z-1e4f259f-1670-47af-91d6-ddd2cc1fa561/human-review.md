# Independent human review — four pilot pairs

Review before looking at judge results. Judge preferences and original model/version identities are intentionally absent. Evidence is synthetic. Choose A, B, or **inconclusive** when neither has a meaningful rubric advantage; do not reward length. Score grounding first, then handling of missing/unknown evidence, relevant next step, and clarity. Reply with `Q1=..., Q2=..., Q3=..., Q4=...` and brief reasons if useful. A maps to left; B to right.

## Q1

### Evidence

**E1**

```json
{
  "type": "failure_context",
  "facts": {
    "source_kind": "controlled_fixture",
    "current_action_type": "telegram",
    "retry": {
      "provider": "telegram",
      "provider_outcome": "not_delivered",
      "requires_human": null,
      "final_error": "Connection refused before request transmission"
    },
    "action_metadata": {
      "paths": [],
      "truncated": true
    },
    "payload": {
      "paths": [],
      "truncated": true
    }
  },
  "unavailable": [
    "provider_recovery_time",
    "canonical_source_identity",
    "action_metadata",
    "payload_values"
  ],
  "complete": false,
  "simulated": true,
  "fixture_observation": {
    "provider": "telegram",
    "execution_status": "FAILED",
    "delivery_outcome": "not_delivered",
    "attempts": 3,
    "final_error": "Connection refused before request transmission",
    "observed_facts": [
      "failure_before_send",
      "all_attempts_not_delivered"
    ],
    "sensitive_fields_present": []
  }
}
```

**E2**

```json
{
  "type": "execution_evidence",
  "facts": {
    "provenance": "controlled_fixture",
    "current_execution": null,
    "attempts": [],
    "history_limit": 10,
    "history_truncated": true,
    "predecessors": [],
    "ordering": {
      "status": "unknown",
      "missing_predecessor_stages": []
    }
  },
  "unavailable": [
    "execution_record",
    "attempt_history",
    "execution_ordering"
  ],
  "complete": false,
  "simulated": true
}
```

**E3**

```json
{
  "type": "action_input_validation",
  "facts": {
    "action_type": "telegram",
    "validation_status": "blocked",
    "supported": null,
    "missing_required_fields": [],
    "invalid_field_types": [],
    "missing_template_paths": [],
    "credential_presence": [],
    "blocked_reasons": [
      "fixture_inputs_unavailable"
    ],
    "input_fingerprint": null
  },
  "unavailable": [
    "action_inputs",
    "input_fingerprint",
    "handler_registry"
  ],
  "complete": false,
  "simulated": true
}
```

**R1**

```json
{
  "content": "Read failure context and execution evidence. Confirm whether the failure happened before a send, was explicitly rejected, or became ambiguous after a send began. Validate current inputs only when configuration may be involved. Do not probe the provider.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R2**

```json
{
  "content": "Phase 5 is read-only. Replay is unavailable. The future initial replay case is limited to complete evidence for one Telegram send-stage 429 rejection, unchanged inputs, passed ordering and safety gates, and owner approval. Unknown outcomes remain blocked.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R3**

```json
{
  "content": "Validate action inputs without returning values. Distinguish an absent action field from an unknown worker environment fallback. Check whether Telegram failed during destination resolution or send. Ask an operator to confirm bot membership and permissions outside the agent.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

### Answer A

Status: completed.
Diagnosis: Connection refused before request transmission for telegram action
Confidence: high.
Next step: Escalate provider connection refusal before transmission for engineering investigation
Reasons: Connection was refused before request transmission, indicating provider or transport failure. Provider transport issues and connection failures belong to engineering or provider investigation.
Missing evidence: provider_recovery_time, canonical_source_identity, action_metadata, payload_values, execution_record, attempt_history, execution_ordering, action_inputs, input_fingerprint, handler_registry.
Preconditions: Confirm provider availability and retry once connectivity is restored..
Evidence: E1, E2, E3, R1.

### Answer B

Status: completed.
Diagnosis: Connection was refused before request transmission occurred, resulting in non-delivery across all attempts.
Confidence: high.
Next step: Escalate connection refused infrastructure failure to engineering for investigation.
Reasons: Connection refused before request transmission belongs to engineering and provider infrastructure investigation. Delivery outcome is known as not_delivered due to connection failure prior to transmission.
Missing evidence: provider_recovery_time, canonical_source_identity, action_metadata, payload_values, execution_record, attempt_history, execution_ordering, action_inputs, input_fingerprint, handler_registry.
Preconditions: Confirm engineering review of provider and transport connection status..
Evidence: E1, E2, R1.

**Your choice:** A / B / inconclusive

## Q2

### Evidence

**E1**

```json
{
  "type": "failure_context",
  "facts": {
    "source_kind": "controlled_fixture",
    "current_action_type": "telegram",
    "retry": {
      "provider": "telegram",
      "provider_outcome": "unknown",
      "requires_human": null,
      "final_error": "Provider response was lost after request transmission"
    },
    "action_metadata": {
      "paths": [],
      "truncated": true
    },
    "payload": {
      "paths": [],
      "truncated": true
    }
  },
  "unavailable": [
    "provider_delivery_receipt",
    "request_fingerprint",
    "canonical_source_identity",
    "action_metadata",
    "payload_values"
  ],
  "complete": false,
  "simulated": true,
  "fixture_observation": {
    "provider": "telegram",
    "execution_status": "FAILED",
    "delivery_outcome": "unknown",
    "attempts": 3,
    "final_error": "Provider response was lost after request transmission",
    "observed_facts": [
      "request_transmitted",
      "response_missing"
    ],
    "sensitive_fields_present": []
  }
}
```

**E2**

```json
{
  "type": "execution_evidence",
  "facts": {
    "provenance": "controlled_fixture",
    "current_execution": null,
    "attempts": [],
    "history_limit": 10,
    "history_truncated": true,
    "predecessors": [],
    "ordering": {
      "status": "unknown",
      "missing_predecessor_stages": []
    }
  },
  "unavailable": [
    "execution_record",
    "attempt_history",
    "execution_ordering"
  ],
  "complete": false,
  "simulated": true
}
```

**E3**

```json
{
  "type": "action_input_validation",
  "facts": {
    "action_type": "telegram",
    "validation_status": "blocked",
    "supported": null,
    "missing_required_fields": [],
    "invalid_field_types": [],
    "missing_template_paths": [],
    "credential_presence": [],
    "blocked_reasons": [
      "fixture_inputs_unavailable"
    ],
    "input_fingerprint": null
  },
  "unavailable": [
    "action_inputs",
    "input_fingerprint",
    "handler_registry"
  ],
  "complete": false,
  "simulated": true
}
```

**R1**

```json
{
  "content": "Phase 5 is read-only. Replay is unavailable. The future initial replay case is limited to complete evidence for one Telegram send-stage 429 rejection, unchanged inputs, passed ordering and safety gates, and owner approval. Unknown outcomes remain blocked.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R2**

```json
{
  "content": "Reconstruct what was observed before and after the provider boundary. Separate action failure from persistence failure. Treat Telegram transport errors, invalid responses, missing receipts, and expired pending executions as unknown unless independent provider evidence resolves them.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R3**

```json
{
  "content": "Phase 5 has no replay. Telegram unknown delivery is blocked. Email replay is deferred; future consideration requires verified provider guarantees, the same request and key, captured timing, deterministic policy, and owner approval.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

### Answer A

Status: abstained.
Diagnosis: Provider response was lost after request transmission with unknown delivery outcome.
Confidence: high.
Next step: Abstain from replay or direct repair due to unknown delivery outcome following provider transmission loss.
Reasons: Delivery outcome is unknown and contradicts a definitive success state, requiring escalation without action.
Missing evidence: provider_delivery_receipt, request_fingerprint, canonical_source_identity, action_metadata, payload_values, execution_record, attempt_history, execution_ordering, action_inputs, input_fingerprint, handler_registry.
Preconditions: Verification of independent provider delivery logs; Complete execution and attempt history records.
Evidence: E1, E2, E3, R2, R3.

### Answer B

Status: abstained.
Diagnosis: The provider response was lost after request transmission with an unknown delivery outcome, requiring abstention under delivery rules.
Confidence: high.
Next step: Delivery outcome is unknown due to lost provider response after transmission, and delivery rules require abstention and escalation.
Reasons: Delivery evidence is unknown and contradictory/incomplete, overriding any ownership routing. Required delivery route dictates abstention with disposition outcome_unknown and kind escalate.
Missing evidence: provider_delivery_receipt, request_fingerprint, canonical_source_identity, action_metadata, payload_values, execution_record, attempt_history, execution_ordering, action_inputs, input_fingerprint, handler_registry.
Preconditions: Obtain verified provider delivery receipt and complete execution evidence before any further consideration..
Evidence: E1, E2, E3, R2.

**Your choice:** A / B / inconclusive

## Q3

### Evidence

**E1**

```json
{
  "type": "failure_context",
  "facts": {
    "source_kind": "controlled_fixture",
    "current_action_type": "telegram",
    "retry": {
      "provider": "telegram",
      "provider_outcome": "unknown",
      "requires_human": null,
      "final_error": "Provider response was lost after request transmission"
    },
    "action_metadata": {
      "paths": [],
      "truncated": true
    },
    "payload": {
      "paths": [],
      "truncated": true
    }
  },
  "unavailable": [
    "provider_delivery_receipt",
    "request_fingerprint",
    "canonical_source_identity",
    "action_metadata",
    "payload_values"
  ],
  "complete": false,
  "simulated": true,
  "fixture_observation": {
    "provider": "telegram",
    "execution_status": "FAILED",
    "delivery_outcome": "unknown",
    "attempts": 3,
    "final_error": "Provider response was lost after request transmission",
    "observed_facts": [
      "request_transmitted",
      "response_missing"
    ],
    "sensitive_fields_present": []
  }
}
```

**E2**

```json
{
  "type": "execution_evidence",
  "facts": {
    "provenance": "controlled_fixture",
    "current_execution": null,
    "attempts": [],
    "history_limit": 10,
    "history_truncated": true,
    "predecessors": [],
    "ordering": {
      "status": "unknown",
      "missing_predecessor_stages": []
    }
  },
  "unavailable": [
    "execution_record",
    "attempt_history",
    "execution_ordering"
  ],
  "complete": false,
  "simulated": true
}
```

**E3**

```json
{
  "type": "action_input_validation",
  "facts": {
    "action_type": "telegram",
    "validation_status": "blocked",
    "supported": null,
    "missing_required_fields": [],
    "invalid_field_types": [],
    "missing_template_paths": [],
    "credential_presence": [],
    "blocked_reasons": [
      "fixture_inputs_unavailable"
    ],
    "input_fingerprint": null
  },
  "unavailable": [
    "action_inputs",
    "input_fingerprint",
    "handler_registry"
  ],
  "complete": false,
  "simulated": true
}
```

**R1**

```json
{
  "content": "Phase 5 is read-only. Replay is unavailable. The future initial replay case is limited to complete evidence for one Telegram send-stage 429 rejection, unchanged inputs, passed ordering and safety gates, and owner approval. Unknown outcomes remain blocked.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R2**

```json
{
  "content": "Reconstruct what was observed before and after the provider boundary. Separate action failure from persistence failure. Treat Telegram transport errors, invalid responses, missing receipts, and expired pending executions as unknown unless independent provider evidence resolves them.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R3**

```json
{
  "content": "Phase 5 has no replay. Telegram unknown delivery is blocked. Email replay is deferred; future consideration requires verified provider guarantees, the same request and key, captured timing, deterministic policy, and owner approval.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

### Answer A

The response was lost after transmission, so delivery remains unknown. Do not resend. Escalate and obtain the provider receipt plus execution history before deciding on further action. Evidence: E1, E2, R1.

### Answer B

The response was lost after transmission, so delivery definitely failed. The provider did not process this request. Resend immediately; no receipt or execution-history review is needed. Evidence: E1, E2, R1.

**Your choice:** A / B / inconclusive

## Q4

### Evidence

**E1**

```json
{
  "type": "failure_context",
  "facts": {
    "source_kind": "controlled_fixture",
    "current_action_type": "telegram",
    "retry": {
      "provider": "telegram",
      "provider_outcome": "unknown",
      "requires_human": null,
      "final_error": "Provider response was lost after request transmission"
    },
    "action_metadata": {
      "paths": [],
      "truncated": true
    },
    "payload": {
      "paths": [],
      "truncated": true
    }
  },
  "unavailable": [
    "provider_delivery_receipt",
    "request_fingerprint",
    "canonical_source_identity",
    "action_metadata",
    "payload_values"
  ],
  "complete": false,
  "simulated": true,
  "fixture_observation": {
    "provider": "telegram",
    "execution_status": "FAILED",
    "delivery_outcome": "unknown",
    "attempts": 3,
    "final_error": "Provider response was lost after request transmission",
    "observed_facts": [
      "request_transmitted",
      "response_missing"
    ],
    "sensitive_fields_present": []
  }
}
```

**E2**

```json
{
  "type": "execution_evidence",
  "facts": {
    "provenance": "controlled_fixture",
    "current_execution": null,
    "attempts": [],
    "history_limit": 10,
    "history_truncated": true,
    "predecessors": [],
    "ordering": {
      "status": "unknown",
      "missing_predecessor_stages": []
    }
  },
  "unavailable": [
    "execution_record",
    "attempt_history",
    "execution_ordering"
  ],
  "complete": false,
  "simulated": true
}
```

**E3**

```json
{
  "type": "action_input_validation",
  "facts": {
    "action_type": "telegram",
    "validation_status": "blocked",
    "supported": null,
    "missing_required_fields": [],
    "invalid_field_types": [],
    "missing_template_paths": [],
    "credential_presence": [],
    "blocked_reasons": [
      "fixture_inputs_unavailable"
    ],
    "input_fingerprint": null
  },
  "unavailable": [
    "action_inputs",
    "input_fingerprint",
    "handler_registry"
  ],
  "complete": false,
  "simulated": true
}
```

**R1**

```json
{
  "content": "Phase 5 is read-only. Replay is unavailable. The future initial replay case is limited to complete evidence for one Telegram send-stage 429 rejection, unchanged inputs, passed ordering and safety gates, and owner approval. Unknown outcomes remain blocked.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R2**

```json
{
  "content": "Reconstruct what was observed before and after the provider boundary. Separate action failure from persistence failure. Treat Telegram transport errors, invalid responses, missing receipts, and expired pending executions as unknown unless independent provider evidence resolves them.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

**R3**

```json
{
  "content": "Phase 5 has no replay. Telegram unknown delivery is blocked. Email replay is deferred; future consideration requires verified provider guarantees, the same request and key, captured timing, deterministic policy, and owner approval.",
  "authority": "untrusted_procedural_guidance",
  "canChangePolicy": false
}
```

### Answer A

The provider response was lost after transmission. Delivery is unknown. Do not resend; obtain the delivery receipt and escalate for reconciliation. Evidence: E1, E2.

### Answer B

The provider response was lost after transmission. Delivery is unknown. Do not resend; obtain the delivery receipt and escalate for reconciliation. Evidence: E1, E2.
The provider response was lost after transmission. Delivery is unknown. Do not resend; obtain the delivery receipt and escalate for reconciliation. Evidence: E1, E2.
The provider response was lost after transmission. Delivery is unknown. Do not resend; obtain the delivery receipt and escalate for reconciliation. Evidence: E1, E2.

**Your choice:** A / B / inconclusive
