RepairLog.clar
(define-constant ERR-NOT-AUTHORIZED u200)
(define-constant ERR-INVALID-REQUEST-ID u201)
(define-constant ERR-INVALID-STEP u202)
(define-constant ERR-INVALID-PROOF-HASH u203)
(define-constant ERR-LOG-ALREADY-FINALIZED u204)
(define-constant ERR-LOG-NOT-FOUND u205)
(define-constant ERR-INVALID-TIMESTAMP u206)
(define-constant ERR-INVALID-STATUS u207)
(define-constant ERR-MAX-LOGS-EXCEEDED u208)
(define-constant ERR-INVALID-UPDATE-PARAM u209)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u210)
(define-constant ERR-INVALID-TECHNICIAN u211)
(define-constant ERR-INVALID-COMPONENT u212)
(define-constant ERR-INVALID-COST u213)
(define-constant ERR-INVALID-DURATION u214)
(define-constant ERR-INVALID-NOTES u215)
(define-constant ERR-INVALID-VERIFIER u216)
(define-constant ERR-INVALID-RATING u217)
(define-constant ERR-INVALID-REVIEW u218)
(define-constant ERR-INVALID-EVIDENCE u219)
(define-constant ERR-INVALID-CATEGORY u220)

(define-data-var next-log-id uint u0)
(define-data-var max-logs uint u100000)
(define-data-var logging-fee uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map logs
  uint
  {
    request-id: uint,
    step: (string-utf8 100),
    proof-hash: (string-utf8 256),
    timestamp: uint,
    finalized: bool,
    technician: principal,
    component: (string-utf8 50),
    cost: uint,
    duration: uint,
    notes: (string-utf8 512),
    verifier: principal,
    rating: uint,
    review: (string-utf8 256),
    evidence: (string-utf8 256),
    category: (string-utf8 50)
  }
)

(define-map logs-by-request
  uint
  (list 100 uint))

(define-map log-updates
  uint
  {
    update-step: (string-utf8 100),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-log (id uint))
  (map-get? logs id)
)

(define-read-only (get-log-updates (id uint))
  (map-get? log-updates id)
)

(define-read-only (get-logs-for-request (request-id uint))
  (default-to (list) (map-get? logs-by-request request-id))
)

(define-private (validate-request-id (req-id uint))
  (if (> req-id u0)
      (ok true)
      (err ERR-INVALID-REQUEST-ID))
)

(define-private (validate-step (step (string-utf8 100)))
  (if (<= (len step) u100)
      (ok true)
      (err ERR-INVALID-STEP))
)

(define-private (validate-proof-hash (proof (string-utf8 256)))
  (if (<= (len proof) u256)
      (ok true)
      (err ERR-INVALID-PROOF-HASH))
)

(define-private (validate-technician (tech principal))
  (ok true)
)

(define-private (validate-component (comp (string-utf8 50)))
  (if (<= (len comp) u50)
      (ok true)
      (err ERR-INVALID-COMPONENT))
)

(define-private (validate-cost (cost uint))
  (if (> cost u0)
      (ok true)
      (err ERR-INVALID-COST))
)

(define-private (validate-duration (dur uint))
  (if (> dur u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-notes (notes (string-utf8 512)))
  (if (<= (len notes) u512)
      (ok true)
      (err ERR-INVALID-NOTES))
)

(define-private (validate-verifier (ver principal))
  (ok true)
)

(define-private (validate-rating (rate uint))
  (if (and (>= rate u1) (<= rate u5))
      (ok true)
      (err ERR-INVALID-RATING))
)

(define-private (validate-review (rev (string-utf8 256)))
  (if (<= (len rev) u256)
      (ok true)
      (err ERR-INVALID-REVIEW))
)

(define-private (validate-evidence (ev (string-utf8 256)))
  (if (<= (len ev) u256)
      (ok true)
      (err ERR-INVALID-EVIDENCE))
)

(define-private (validate-category (cat (string-utf8 50)))
  (if (or (is-eq cat u"hardware") (is-eq cat u"software") (is-eq cat u"diagnostic"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-logs (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-logs new-max)
    (ok true)
  )
)

(define-public (set-logging-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set logging-fee new-fee)
    (ok true)
  )
)

(define-public (add-log-entry
  (request-id uint)
  (step (string-utf8 100))
  (proof-hash (string-utf8 256))
  (technician principal)
  (component (string-utf8 50))
  (cost uint)
  (duration uint)
  (notes (string-utf8 512))
  (verifier principal)
  (rating uint)
  (review (string-utf8 256))
  (evidence (string-utf8 256))
  (category (string-utf8 50))
)
  (let (
        (next-id (var-get next-log-id))
        (current-max (var-get max-logs))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-LOGS-EXCEEDED))
    (try! (validate-request-id request-id))
    (try! (validate-step step))
    (try! (validate-proof-hash proof-hash))
    (try! (validate-technician technician))
    (try! (validate-component component))
    (try! (validate-cost cost))
    (try! (validate-duration duration))
    (try! (validate-notes notes))
    (try! (validate-verifier verifier))
    (try! (validate-rating rating))
    (try! (validate-review review))
    (try! (validate-evidence evidence))
    (try! (validate-category category))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get logging-fee) tx-sender authority-recipient))
    )
    (map-set logs next-id
      {
        request-id: request-id,
        step: step,
        proof-hash: proof-hash,
        timestamp: block-height,
        finalized: false,
        technician: technician,
        component: component,
        cost: cost,
        duration: duration,
        notes: notes,
        verifier: verifier,
        rating: rating,
        review: review,
        evidence: evidence,
        category: category
      }
    )
    (map-set logs-by-request request-id
      (unwrap! (as-max-len? (append (get-logs-for-request request-id) next-id) u100) (err ERR-MAX_LOGS_EXCEEDED))
    )
    (var-set next-log-id (+ next-id u1))
    (print { event: "log-added", id: next-id })
    (ok next-id)
  )
)

(define-public (finalize-log (log-id uint))
  (let ((log (map-get? logs log-id)))
    (match log
      l
        (begin
          (asserts! (is-eq (get technician l) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (not (get finalized l)) (err ERR-LOG-ALREADY-FINALIZED))
          (map-set logs log-id
            (merge l { finalized: true, timestamp: block-height })
          )
          (print { event: "log-finalized", id: log-id })
          (ok true)
        )
      (err ERR-LOG-NOT-FOUND)
    )
  )
)

(define-public (update-log-step (log-id uint) (new-step (string-utf8 100)))
  (let ((log (map-get? logs log-id)))
    (match log
      l
        (begin
          (asserts! (is-eq (get technician l) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (not (get finalized l)) (err ERR-LOG-ALREADY-FINALIZED))
          (try! (validate-step new-step))
          (map-set logs log-id
            (merge l { step: new-step, timestamp: block-height })
          )
          (map-set log-updates log-id
            {
              update-step: new-step,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "log-updated", id: log-id })
          (ok true)
        )
      (err ERR-LOG-NOT-FOUND)
    )
  )
)

(define-public (get-log-count)
  (ok (var-get next-log-id))
)