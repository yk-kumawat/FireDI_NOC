import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import app from "../app.js";
import User, { UserRole } from "../models/User.js";
import Application, {
  ApplicationStatus,
  BuildingStatus,
  OccupancyCategory,
} from "../models/Application.js";
import Checklist, { ChecklistItemStatus } from "../models/Checklist.js";
import { evaluateApplicationRules, ACTIVE_RULESET_VERSION } from "../rules/ruleSet.js";

async function runTests() {
  console.log("Connecting to local MongoDB database for Phase 2 verification...");
  const mongoUri = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/SFM-TEST-PHASE2";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Phase 2 test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(` PASS: ${testName}`);
      passed++;
    } else {
      console.error(` FAIL: ${testName}`, detail || "");
      failed++;
    }
  }

  const createdAppIds: any[] = [];
  const createdUserIds: any[] = [];

  try {
    // Setup test users
    const email1 = `p2_applicant_1_${Date.now()}@example.com`;
    const email2 = `p2_applicant_2_${Date.now()}@example.com`;
    const inspEmail = `p2_inspector_${Date.now()}@example.com`;

    // 1. Register Applicant 1
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Phase2 Applicant One",
        email: email1,
        phone: "9812345670",
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    const regData1 = await regRes1.json();
    const token1 = regData1.data?.token;
    const user1Id = regData1.data?.user?.id;
    createdUserIds.push(user1Id);

    // 2. Register Applicant 2
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Phase2 Applicant Two",
        email: email2,
        phone: "9812345671",
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    const regData2 = await regRes2.json();
    const token2 = regData2.data?.token;
    const user2Id = regData2.data?.user?.id;
    createdUserIds.push(user2Id);

    // 3. Create and login Inspector
    const inspUser = await User.create({
      name: "Phase2 Inspector",
      email: inspEmail,
      phone: "9812345672",
      password: "password123",
      role: UserRole.INSPECTOR,
    });
    createdUserIds.push(inspUser._id);

    const loginInspRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inspEmail, password: "password123" }),
    });
    const inspLoginData = await loginInspRes.json();
    const inspToken = inspLoginData.data?.token;

    // Helper to create application
    async function createTestApp(token: string, details: any) {
      const createRes = await fetch(`${baseUrl}/api/applications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const createData = await createRes.json();
      const appId = createData.data?.application?._id;
      createdAppIds.push(appId);

      if (details) {
        await fetch(`${baseUrl}/api/applications/${appId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ buildingDetails: details }),
        });
      }
      return appId;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: Industrial applications receive raw material and finished goods requirements
    // ──────────────────────────────────────────────────────────────────────────
    const industrialAppId = await createTestApp(token1, {
      buildingName: "Apex Chemical Refinery",
      buildingType: "Industrial Unit",
      buildingStatus: BuildingStatus.NEW,
      occupancyCategory: OccupancyCategory.INDUSTRIAL,
      numberOfFloors: 3,
      builtUpArea: 5000,
      builtUpAreaUnit: "sq.m",
    });

    const genRes1 = await fetch(`${baseUrl}/api/applications/${industrialAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData1 = await genRes1.json();
    const items1 = genData1.data?.checklist?.items || [];
    const itemIds1 = items1.map((i: any) => i.requirementId);

    assert(
      itemIds1.includes("REQ_RAW_MATERIALS") && itemIds1.includes("REQ_FINISHED_GOODS") && itemIds1.includes("REQ_PROCESS_FLOW_CHART"),
      "Test 1: Industrial applications receive raw materials, finished goods, and process flow requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Existing buildings receive applicable existing-building requirements
    // ──────────────────────────────────────────────────────────────────────────
    const existingAppId = await createTestApp(token1, {
      buildingName: "Heritage Commercial Tower",
      buildingType: "Office Complex",
      buildingStatus: BuildingStatus.EXISTING,
      occupancyCategory: OccupancyCategory.COMMERCIAL,
      numberOfFloors: 6,
      builtUpArea: 3500,
      builtUpAreaUnit: "sq.m",
    });

    const genRes2 = await fetch(`${baseUrl}/api/applications/${existingAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData2 = await genRes2.json();
    const itemIds2 = (genData2.data?.checklist?.items || []).map((i: any) => i.requirementId);

    assert(
      itemIds2.includes("REQ_EXISTING_FIRE_PROTECTION") && itemIds2.includes("REQ_OCCUPANCY_CERTIFICATE"),
      "Test 2: Existing buildings receive existing fire protection and occupancy certificate requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Applications involving hazardous materials receive configured requirement
    // ──────────────────────────────────────────────────────────────────────────
    const hazAppId = await createTestApp(token1, {
      buildingName: "Central Warehouse",
      buildingType: "Storage Depot",
      buildingStatus: BuildingStatus.NEW,
      occupancyCategory: OccupancyCategory.COMMERCIAL,
      hasHazardousMaterials: true,
      hazardousMaterialsDescription: "Flammable solvent barrels",
      numberOfFloors: 1,
      builtUpArea: 2000,
      builtUpAreaUnit: "sq.m",
    });

    const genRes3 = await fetch(`${baseUrl}/api/applications/${hazAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData3 = await genRes3.json();
    const itemIds3 = (genData3.data?.checklist?.items || []).map((i: any) => i.requirementId);

    assert(
      itemIds3.includes("REQ_HAZARDOUS_APPROVALS"),
      "Test 3: Hazardous material applications receive statutory government agency approval requirement"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Applications matching several rules receive all applicable requirements
    // ──────────────────────────────────────────────────────────────────────────
    const comboAppId = await createTestApp(token1, {
      buildingName: "Industrial Petrochem Plant B",
      buildingType: "Petrochemical Refinery",
      buildingStatus: BuildingStatus.EXISTING,
      occupancyCategory: OccupancyCategory.INDUSTRIAL,
      hasHazardousMaterials: true,
      hazardousMaterialsDescription: "Class A flammable hydrocarbons",
      isHighRise: true,
      buildingHeight: 45,
      numberOfFloors: 12,
      builtUpArea: 25000,
      builtUpAreaUnit: "sq.m",
    });

    const genRes4 = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData4 = await genRes4.json();
    const items4 = genData4.data?.checklist?.items || [];
    const itemIds4 = items4.map((i: any) => i.requirementId);

    const hasCommon = itemIds4.includes("REQ_APPLICATION_LETTER") && itemIds4.includes("REQ_ARCHITECTURAL_DRAWINGS");
    const hasIndustrial = itemIds4.includes("REQ_RAW_MATERIALS") && itemIds4.includes("REQ_FINISHED_GOODS");
    const hasExisting = itemIds4.includes("REQ_EXISTING_FIRE_PROTECTION") && itemIds4.includes("REQ_OCCUPANCY_CERTIFICATE");
    const hasHazardous = itemIds4.includes("REQ_HAZARDOUS_APPROVALS");
    const hasHighRise = itemIds4.includes("REQ_CIVIL_AVIATION_NOC");

    assert(
      hasCommon && hasIndustrial && hasExisting && hasHazardous && hasHighRise,
      "Test 4: Combinatorial application receives common, industrial, existing, hazardous, and high-rise requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Common requirements are not duplicated when several rules match
    // ──────────────────────────────────────────────────────────────────────────
    const uniqueItemIds4 = new Set(itemIds4);
    assert(
      items4.length === uniqueItemIds4.size,
      `Test 5: No duplicate checklist items generated (${items4.length} items total, all unique IDs)`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: Non-industrial applications do not receive industrial-only requirements
    // ──────────────────────────────────────────────────────────────────────────
    const residentialAppId = await createTestApp(token1, {
      buildingName: "Sunrise Apartment Block",
      buildingType: "Residential Flats",
      buildingStatus: BuildingStatus.NEW,
      occupancyCategory: OccupancyCategory.RESIDENTIAL,
      numberOfFloors: 4,
      builtUpArea: 1800,
      builtUpAreaUnit: "sq.m",
    });

    const genRes6 = await fetch(`${baseUrl}/api/applications/${residentialAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData6 = await genRes6.json();
    const itemIds6 = (genData6.data?.checklist?.items || []).map((i: any) => i.requirementId);

    assert(
      !itemIds6.includes("REQ_RAW_MATERIALS") && !itemIds6.includes("REQ_FINISHED_GOODS"),
      "Test 6: Residential applications do not receive industrial requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: New buildings do not receive existing-building-only requirements
    // ──────────────────────────────────────────────────────────────────────────
    assert(
      !itemIds6.includes("REQ_EXISTING_FIRE_PROTECTION") && !itemIds6.includes("REQ_OCCUPANCY_CERTIFICATE"),
      "Test 7: New construction buildings do not receive existing-building requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: Applications without hazardous materials do not receive hazardous requirement
    // ──────────────────────────────────────────────────────────────────────────
    assert(
      !itemIds6.includes("REQ_HAZARDOUS_APPROVALS"),
      "Test 8: Applications without hazardous materials do not receive hazardous requirement"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 9: Missing or empty application building details handled explicitly
    // ──────────────────────────────────────────────────────────────────────────
    const blankAppId = await createTestApp(token1, null);
    const genRes9 = await fetch(`${baseUrl}/api/applications/${blankAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const genData9 = await genRes9.json();
    const itemIds9 = (genData9.data?.checklist?.items || []).map((i: any) => i.requirementId);
    assert(
      genRes9.status === 200 && itemIds9.includes("REQ_APPLICATION_LETTER") && !itemIds9.includes("REQ_RAW_MATERIALS"),
      "Test 9: Incomplete draft evaluates common baseline requirements without errors"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 10: Identical application data and rule versions produce identical results (Determinism)
    // ──────────────────────────────────────────────────────────────────────────
    const appDoc = await Application.findById(comboAppId);
    const evalResult1 = evaluateApplicationRules(appDoc!);
    const evalResult2 = evaluateApplicationRules(appDoc!);

    const eval1Ids = evalResult1.requirements.map((r) => r.requirement.id);
    const eval2Ids = evalResult2.requirements.map((r) => r.requirement.id);

    assert(
      JSON.stringify(eval1Ids) === JSON.stringify(eval2Ids) && evalResult1.ruleSetVersion === ACTIVE_RULESET_VERSION,
      "Test 10: Deterministic evaluation produces identical requirement sets and versions"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 11: Repeated generation does not create duplicate checklist items
    // ──────────────────────────────────────────────────────────────────────────
    const repeatGen1 = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const repeatData1 = await repeatGen1.json();
    const repeatItems1 = repeatData1.data?.checklist?.items || [];

    const repeatGen2 = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const repeatData2 = await repeatGen2.json();
    const repeatItems2 = repeatData2.data?.checklist?.items || [];

    assert(
      repeatItems1.length === repeatItems2.length && repeatItems2.length === items4.length,
      "Test 11: Repeated checklist generation does not duplicate items or DB records"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 12: Existing applicant responses are preserved when requirements remain applicable
    // ──────────────────────────────────────────────────────────────────────────
    // Submit response for raw materials on comboAppId
    const patchRes = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/items/REQ_RAW_MATERIALS`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        materials: [
          { name: "Methanol Solvent", quantity: 500, unit: "litres", storageLocation: "Solvent Tank 1" },
          { name: "LPG Fuel", quantity: 20, unit: "cylinders", storageLocation: "Gas Shed East" },
        ],
      }),
    });
    const patchData = await patchRes.json();
    const patchedItem = patchData.data?.checklist?.items?.find((i: any) => i.requirementId === "REQ_RAW_MATERIALS");

    assert(
      patchRes.status === 200 && patchedItem?.status === "COMPLETED" && patchedItem?.response?.materials?.length === 2,
      "Test 12A: Applicant can successfully submit raw materials response"
    );

    // Now re-generate/refresh checklist
    const refreshRes = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const refreshData = await refreshRes.json();
    const refreshedItem = refreshData.data?.checklist?.items?.find((i: any) => i.requirementId === "REQ_RAW_MATERIALS");

    assert(
      refreshedItem?.status === "COMPLETED" && refreshedItem?.response?.materials?.length === 2 && refreshedItem?.response?.materials[0]?.name === "Methanol Solvent",
      "Test 12B: Checklist refresh preserves existing applicant responses for still-applicable requirements"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 13: Applicant ownership restrictions are enforced
    // ──────────────────────────────────────────────────────────────────────────
    const crossGet = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const crossPatch = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/items/REQ_RAW_MATERIALS`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token2}`, "Content-Type": "application/json" },
      body: JSON.stringify({ materials: [{ name: "Hack", quantity: 1, unit: "kg", storageLocation: "X" }] }),
    });
    assert(
      crossGet.status === 403 && crossPatch.status === 403,
      "Test 13: Cross-applicant checklist read and response patch access is strictly forbidden (403)"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 14: Inspectors cannot access applicant-only checklist endpoints
    // ──────────────────────────────────────────────────────────────────────────
    const inspGet = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist`, {
      headers: { Authorization: `Bearer ${inspToken}` },
    });
    const inspGen = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${inspToken}` },
    });
    assert(
      inspGet.status === 403 && inspGen.status === 403,
      "Test 14: Inspector role cannot access applicant checklist endpoints (403)"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 15: Applicants cannot alter rule definitions or mandatory flags
    // ──────────────────────────────────────────────────────────────────────────
    // Attempting to send modified ruleReferences, required flag, or ruleSetVersion
    const tamperPatch = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/items/REQ_RAW_MATERIALS`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        materials: [{ name: "Toluene", quantity: 10, unit: "kg", storageLocation: "Bay 1" }],
        required: false,
        ruleReferences: ["HACKED_RULE"],
        name: "Hacked Requirement Name",
      }),
    });
    const tamperData = await tamperPatch.json();
    const rawMatAfterTamper = tamperData.data?.checklist?.items?.find((i: any) => i.requirementId === "REQ_RAW_MATERIALS");

    assert(
      rawMatAfterTamper?.required === true &&
        rawMatAfterTamper?.name === "Raw Materials List & Storage Locations" &&
        rawMatAfterTamper?.ruleReferences?.includes("RULE_INDUSTRIAL"),
      "Test 15: Immutability of rule references, requirement name, and mandatory flag is maintained"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 16: Submitted applications remain subject to Phase 1 edit restrictions
    // ──────────────────────────────────────────────────────────────────────────
    // Fill all required fields on comboAppId to submit it
    await fetch(`${baseUrl}/api/applications/${comboAppId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantDetails: { name: "Phase2 Applicant One", email: email1, phone: "9812345670" },
        buildingDetails: {
          buildingName: "Industrial Petrochem Plant B",
          buildingType: "Petrochemical Refinery",
          buildingStatus: BuildingStatus.EXISTING,
          occupancyCategory: OccupancyCategory.INDUSTRIAL,
          location: { address: "Plot 99, MIDC", state: "Maharashtra", district: "Thane", pincode: "400601" },
          numberOfFloors: 12,
          builtUpArea: 25000,
          builtUpAreaUnit: "sq.m",
          isHighRise: true,
          buildingHeight: 45,
          hasHazardousMaterials: true,
          hazardousMaterialsDescription: "Class A flammable hydrocarbons",
        },
        architectDetails: { name: "Ar. Sanjay Rao", email: "sanjay@example.com", phone: "9820000000" },
      }),
    });

    const submitRes = await fetch(`${baseUrl}/api/applications/${comboAppId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(submitRes.status === 200, "Submission prerequisite: Application successfully transitioned to SUBMITTED");

    // Try to patch checklist item after submission
    const patchAfterSubmit = await fetch(`${baseUrl}/api/applications/${comboAppId}/checklist/items/REQ_RAW_MATERIALS`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({ materials: [{ name: "Post Submit Material", quantity: 1, unit: "kg", storageLocation: "Z" }] }),
    });
    assert(
      patchAfterSubmit.status === 403,
      "Test 16: Checklist item responses cannot be updated on submitted applications (403)"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 17: Response validation works correctly (rejects invalid raw material payload)
    // ──────────────────────────────────────────────────────────────────────────
    const invalidPatchRes = await fetch(`${baseUrl}/api/applications/${industrialAppId}/checklist/items/REQ_RAW_MATERIALS`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        materials: [{ name: "", quantity: -10, unit: "", storageLocation: "" }], // Missing name, negative qty, missing unit
      }),
    });
    assert(
      invalidPatchRes.status === 422,
      "Test 17: Invalid raw material payloads are rejected with 422 Unprocessable Entity"
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 18: Existing Phase 1 application listing and detail retrieval work without regression
    // ──────────────────────────────────────────────────────────────────────────
    const appListRes = await fetch(`${baseUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const appListData = await appListRes.json();
    assert(
      appListRes.status === 200 && appListData.data?.applications?.length >= 5,
      "Test 18: Existing Phase 1 application management features continue working smoothly"
    );

    // Clean up
    await Checklist.deleteMany({ applicationId: { $in: createdAppIds } });
    await Application.deleteMany({ _id: { $in: createdAppIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });

    console.log(`\n======================================================`);
    console.log(`Phase 2 Automated Tests Finished: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
