// repair-log-test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 200;
const ERR_INVALID_REQUEST_ID = 201;
const ERR_INVALID_STEP = 202;
const ERR_INVALID_PROOF_HASH = 203;
const ERR_LOG_ALREADY_FINALIZED = 204;
const ERR_LOG_NOT_FOUND = 205;
const ERR_MAX_LOGS_EXCEEDED = 208;
const ERR_INVALID_UPDATE_PARAM = 209;
const ERR_AUTHORITY_NOT_VERIFIED = 210;
const ERR_INVALID_COMPONENT = 212;
const ERR_INVALID_COST = 213;
const ERR_INVALID_DURATION = 214;
const ERR_INVALID_NOTES = 215;
const ERR_INVALID_RATING = 217;
const ERR_INVALID_REVIEW = 218;
const ERR_INVALID_EVIDENCE = 219;
const ERR_INVALID_CATEGORY = 220;

interface Log {
  requestId: number;
  step: string;
  proofHash: string;
  timestamp: number;
  finalized: boolean;
  technician: string;
  component: string;
  cost: number;
  duration: number;
  notes: string;
  verifier: string;
  rating: number;
  review: string;
  evidence: string;
  category: string;
}

interface LogUpdate {
  updateStep: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class RepairLogMock {
  state: {
    nextLogId: number;
    maxLogs: number;
    loggingFee: number;
    authorityContract: string | null;
    logs: Map<number, Log>;
    logUpdates: Map<number, LogUpdate>;
    logsByRequest: Map<number, number[]>;
  } = {
    nextLogId: 0,
    maxLogs: 100000,
    loggingFee: 100,
    authorityContract: null,
    logs: new Map(),
    logUpdates: new Map(),
    logsByRequest: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextLogId: 0,
      maxLogs: 100000,
      loggingFee: 100,
      authorityContract: null,
      logs: new Map(),
      logUpdates: new Map(),
      logsByRequest: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setLoggingFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.loggingFee = newFee;
    return { ok: true, value: true };
  }

  addLogEntry(
    requestId: number,
    step: string,
    proofHash: string,
    technician: string,
    component: string,
    cost: number,
    duration: number,
    notes: string,
    verifier: string,
    rating: number,
    review: string,
    evidence: string,
    category: string
  ): Result<number> {
    if (this.state.nextLogId >= this.state.maxLogs) return { ok: false, value: ERR_MAX_LOGS_EXCEEDED };
    if (requestId <= 0) return { ok: false, value: ERR_INVALID_REQUEST_ID };
    if (step.length > 100) return { ok: false, value: ERR_INVALID_STEP };
    if (proofHash.length > 256) return { ok: false, value: ERR_INVALID_PROOF_HASH };
    if (component.length > 50) return { ok: false, value: ERR_INVALID_COMPONENT };
    if (cost <= 0) return { ok: false, value: ERR_INVALID_COST };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (notes.length > 512) return { ok: false, value: ERR_INVALID_NOTES };
    if (rating < 1 || rating > 5) return { ok: false, value: ERR_INVALID_RATING };
    if (review.length > 256) return { ok: false, value: ERR_INVALID_REVIEW };
    if (evidence.length > 256) return { ok: false, value: ERR_INVALID_EVIDENCE };
    if (!["hardware", "software", "diagnostic"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.loggingFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextLogId;
    const log: Log = {
      requestId,
      step,
      proofHash,
      timestamp: this.blockHeight,
      finalized: false,
      technician,
      component,
      cost,
      duration,
      notes,
      verifier,
      rating,
      review,
      evidence,
      category,
    };
    this.state.logs.set(id, log);
    const currentLogs = this.state.logsByRequest.get(requestId) || [];
    if (currentLogs.length >= 100) return { ok: false, value: ERR_MAX_LOGS_EXCEEDED };
    currentLogs.push(id);
    this.state.logsByRequest.set(requestId, currentLogs);
    this.state.nextLogId++;
    return { ok: true, value: id };
  }

  getLog(id: number): Log | null {
    return this.state.logs.get(id) || null;
  }

  finalizeLog(id: number): Result<boolean> {
    const log = this.state.logs.get(id);
    if (!log) return { ok: false, value: false };
    if (log.technician !== this.caller) return { ok: false, value: false };
    if (log.finalized) return { ok: false, value: false };
    const updated: Log = { ...log, finalized: true, timestamp: this.blockHeight };
    this.state.logs.set(id, updated);
    return { ok: true, value: true };
  }

  updateLogStep(id: number, newStep: string): Result<boolean> {
    const log = this.state.logs.get(id);
    if (!log) return { ok: false, value: false };
    if (log.technician !== this.caller) return { ok: false, value: false };
    if (log.finalized) return { ok: false, value: false };
    if (newStep.length > 100) return { ok: false, value: false };
    const updated: Log = { ...log, step: newStep, timestamp: this.blockHeight };
    this.state.logs.set(id, updated);
    this.state.logUpdates.set(id, {
      updateStep: newStep,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getLogCount(): Result<number> {
    return { ok: true, value: this.state.nextLogId };
  }

  getLogsForRequest(requestId: number): number[] {
    return this.state.logsByRequest.get(requestId) || [];
  }
}

describe("RepairLog", () => {
  let contract: RepairLogMock;

  beforeEach(() => {
    contract = new RepairLogMock();
    contract.reset();
  });

  it("adds a log entry successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const log = contract.getLog(0);
    expect(log?.step).toBe("Diagnosis");
    expect(log?.proofHash).toBe("proof123");
    expect(log?.technician).toBe("STTECH");
    expect(log?.component).toBe("RAM");
    expect(log?.cost).toBe(50);
    expect(log?.duration).toBe(2);
    expect(log?.notes).toBe("Notes here");
    expect(log?.verifier).toBe("STVER");
    expect(log?.rating).toBe(4);
    expect(log?.review).toBe("Good job");
    expect(log?.evidence).toBe("evidence.jpg");
    expect(log?.category).toBe("hardware");
    expect(log?.finalized).toBe(false);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects add without authority contract", () => {
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid rating", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      6,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_RATING);
  });

  it("rejects invalid step", () => {
    contract.setAuthorityContract("ST2TEST");
    const longStep = "a".repeat(101);
    const result = contract.addLogEntry(
      1,
      longStep,
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STEP);
  });

  it("rejects invalid proof hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const longProofHash = "a".repeat(257);
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      longProofHash,
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROOF_HASH);
  });

  it("rejects invalid component", () => {
    contract.setAuthorityContract("ST2TEST");
    const longComponent = "a".repeat(51);
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      longComponent,
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_COMPONENT);
  });

  it("rejects invalid cost", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      0,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_COST);
  });

  it("rejects invalid duration", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      0,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DURATION);
  });

  it("rejects invalid notes", () => {
    contract.setAuthorityContract("ST2TEST");
    const longNotes = "a".repeat(513);
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      longNotes,
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_NOTES);
  });

  it("rejects invalid review", () => {
    contract.setAuthorityContract("ST2TEST");
    const longReview = "a".repeat(257);
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      longReview,
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_REVIEW);
  });

  it("rejects invalid evidence", () => {
    contract.setAuthorityContract("ST2TEST");
    const longEvidence = "a".repeat(257);
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      longEvidence,
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EVIDENCE);
  });

  it("rejects invalid category", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "invalid"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CATEGORY);
  });

  it("finalizes log successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "ST1TEST",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const result = contract.finalizeLog(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const log = contract.getLog(0);
    expect(log?.finalized).toBe(true);
  });

  it("rejects finalize by non-technician", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const result = contract.finalizeLog(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects finalize on non-existent log", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.finalizeLog(999);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects finalize on already finalized log", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "ST1TEST",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    contract.finalizeLog(0);
    const result = contract.finalizeLog(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("updates log step successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Old step",
      "proof123",
      "ST1TEST",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const result = contract.updateLogStep(0, "New step");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const log = contract.getLog(0);
    expect(log?.step).toBe("New step");
    const update = contract.state.logUpdates.get(0);
    expect(update?.updateStep).toBe("New step");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update on non-existent log", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateLogStep(999, "New step");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-technician", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const result = contract.updateLogStep(0, "New step");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update on finalized log", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "ST1TEST",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    contract.finalizeLog(0);
    const result = contract.updateLogStep(0, "New step");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update with invalid step", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "ST1TEST",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const longStep = "a".repeat(101);
    const result = contract.updateLogStep(0, longStep);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct log count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    contract.addLogEntry(
      2,
      "Repair",
      "proof456",
      "STTECH",
      "CPU",
      100,
      4,
      "More notes",
      "STVER",
      5,
      "Excellent",
      "evidence2.jpg",
      "software"
    );
    const result = contract.getLogCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("gets logs for request correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    contract.addLogEntry(
      1,
      "Repair",
      "proof456",
      "STTECH",
      "CPU",
      100,
      4,
      "More notes",
      "STVER",
      5,
      "Excellent",
      "evidence2.jpg",
      "software"
    );
    const logs = contract.getLogsForRequest(1);
    expect(logs).toEqual([0, 1]);
  });

  it("parses log parameters with Clarity types", () => {
    const step = stringUtf8CV("Diagnosis");
    const cost = uintCV(50);
    expect(step.value).toBe("Diagnosis");
    expect(cost.value).toEqual(BigInt(50));
  });

  it("rejects log addition when max logs exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxLogs = 1;
    contract.addLogEntry(
      1,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    const result = contract.addLogEntry(
      2,
      "Repair",
      "proof456",
      "STTECH",
      "CPU",
      100,
      4,
      "More notes",
      "STVER",
      5,
      "Excellent",
      "evidence2.jpg",
      "software"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_LOGS_EXCEEDED);
  });

  it("rejects log addition with invalid request ID", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.addLogEntry(
      0,
      "Diagnosis",
      "proof123",
      "STTECH",
      "RAM",
      50,
      2,
      "Notes here",
      "STVER",
      4,
      "Good job",
      "evidence.jpg",
      "hardware"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_REQUEST_ID);
  });

  it("rejects setting negative logging fee", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setLoggingFee(-1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});