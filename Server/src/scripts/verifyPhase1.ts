import "dotenv/config";
import http from "http";
import app from "../app.js";
import { connectDatabase } from "../config/db.js";
import User, { UserRole } from "../models/User.js";
import Application, { ApplicationStatus } from "../models/Application.js";

import mongoose from "mongoose";

async function runTests() {
  console.log("Connecting to local MongoDB database...");
  const mongoUri = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/SFM-TEST";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for testing");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

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

  try {
    // Clean up any previous test accounts
    const testEmail1 = `test_applicant_1_${Date.now()}@example.com`;
    const testEmail2 = `test_applicant_2_${Date.now()}@example.com`;
    const testInspectorEmail = `test_inspector_${Date.now()}@example.com`;

    // 1. Register Applicant 1
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Applicant One",
        email: testEmail1,
        phone: "9876543210",
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    const regData1 = await regRes1.json();
    assert(regRes1.status === 201 && regData1.data?.token, "Applicant 1 registration");
    const token1 = regData1.data?.token;

    // 2. Register Applicant 2
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Applicant Two",
        email: testEmail2,
        phone: "9876543211",
        password: "password123",
        confirmPassword: "password123",
      }),
    });
    const regData2 = await regRes2.json();
    assert(regRes2.status === 201 && regData2.data?.token, "Applicant 2 registration");
    const token2 = regData2.data?.token;

    // 3. Create Inspector directly in DB to get inspector token
    const inspectorUser = await User.create({
      name: "Inspector Official",
      email: testInspectorEmail,
      phone: "9876543212",
      password: "password123",
      role: UserRole.INSPECTOR,
    });
    const loginInspectorRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testInspectorEmail,
        password: "password123",
      }),
    });
    const inspectorData = await loginInspectorRes.json();
    const inspectorToken = inspectorData.data?.token;
    assert(loginInspectorRes.status === 200 && inspectorToken, "Inspector login & token generation");

    // Scenario 1: An authenticated applicant can create a draft
    const createRes = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
    });
    const createData = await createRes.json();
    assert(
      createRes.status === 201 && createData.data?.application?.status === "DRAFT",
      "Scenario 1: Authenticated applicant can create a draft"
    );
    const app1 = createData.data?.application;
    const appId1 = app1?._id;

    // Scenario 2: A newly created application receives a unique reference in FNO-YYYY-XXXXXXXX format
    const refRegex = /^FNO-\d{4}-[A-F0-9]{8}$/;
    assert(
      refRegex.test(app1?.applicationId),
      `Scenario 2: Application receives a unique reference matching FNO-YYYY-XXXXXXXX (${app1?.applicationId})`
    );

    // Scenario 3: An applicant can save and retrieve an incomplete draft
    const getRes = await fetch(`${baseUrl}/api/applications/${appId1}`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const getData = await getRes.json();
    assert(
      getRes.status === 200 && getData.data?.application?.applicationId === app1.applicationId,
      "Scenario 3: Applicant can retrieve incomplete draft"
    );

    // Scenario 4: An applicant can update their own draft
    const updateRes = await fetch(`${baseUrl}/api/applications/${appId1}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingDetails: {
          buildingName: "Empire Heights",
          buildingType: "Commercial Complex",
          buildingStatus: "NEW",
          occupancyCategory: "COMMERCIAL",
          location: {
            address: "123 Business Bay",
            state: "Maharashtra",
            district: "Mumbai",
            pincode: "400001",
          },
          numberOfFloors: 10,
          builtUpArea: 15000,
          builtUpAreaUnit: "sq.m",
          isHighRise: true,
          buildingHeight: 35,
          hasHazardousMaterials: false,
        },
        architectDetails: {
          name: "Ar. Priya Sharma",
          registrationNumber: "CA/2020/12345",
          email: "priya.sharma@example.com",
          phone: "9876500000",
        },
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 && updateData.data?.application?.buildingDetails?.buildingName === "Empire Heights",
      "Scenario 4: Applicant can update their own draft"
    );

    // Scenario 5: An applicant can list only their own applications
    const listRes1 = await fetch(`${baseUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const listData1 = await listRes1.json();
    const listRes2 = await fetch(`${baseUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const listData2 = await listRes2.json();
    assert(
      listData1.data?.applications?.length === 1 && listData2.data?.applications?.length === 0,
      "Scenario 5: Applicant can list only their own applications (Applicant 2 has 0, Applicant 1 has 1)"
    );

    // Scenario 6: Invalid submissions are rejected with useful validation errors
    // Create an empty draft for applicant 2 and try submitting
    const createDraft2 = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token2}`, "Content-Type": "application/json" },
    });
    const draft2Data = await createDraft2.json();
    const draft2Id = draft2Data.data?.application?._id;

    const invalidSubmitRes = await fetch(`${baseUrl}/api/applications/${draft2Id}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token2}` },
    });
    const invalidSubmitData = await invalidSubmitRes.json();
    assert(
      invalidSubmitRes.status === 422 && Array.isArray(invalidSubmitData.errors) && invalidSubmitData.errors.length > 0,
      "Scenario 6: Incomplete draft submission is rejected with status 422 and structured field errors"
    );

    // Scenario 7: An applicant can submit a valid draft
    const validSubmitRes = await fetch(`${baseUrl}/api/applications/${appId1}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    const validSubmitData = await validSubmitRes.json();
    assert(
      validSubmitRes.status === 200 && validSubmitData.data?.application?.status === "SUBMITTED",
      "Scenario 7: Applicant can submit valid draft (status transitioned to SUBMITTED)"
    );

    // Scenario 8: A submitted application cannot be edited
    const editSubmittedRes = await fetch(`${baseUrl}/api/applications/${appId1}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingDetails: { buildingName: "Hacked Name" },
      }),
    });
    assert(
      editSubmittedRes.status === 403,
      "Scenario 8: Submitted application cannot be edited (403 Forbidden)"
    );

    // Scenario 9: A submitted application cannot be submitted again
    const reSubmitRes = await fetch(`${baseUrl}/api/applications/${appId1}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(
      reSubmitRes.status === 409,
      "Scenario 9: A submitted application cannot be re-submitted (409 Conflict)"
    );

    // Scenario 10: One applicant cannot access or modify another applicant's application
    const crossAccessGet = await fetch(`${baseUrl}/api/applications/${appId1}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const crossAccessPut = await fetch(`${baseUrl}/api/applications/${appId1}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token2}`, "Content-Type": "application/json" },
      body: JSON.stringify({ buildingDetails: { buildingName: "Stolen Application" } }),
    });
    assert(
      crossAccessGet.status === 403 && crossAccessPut.status === 403,
      "Scenario 10: Cross-applicant access is forbidden (403 for read and edit)"
    );

    // Scenario 11: An inspector cannot use applicant-only application management endpoints
    const inspectorAccess = await fetch(`${baseUrl}/api/applications`, {
      headers: { Authorization: `Bearer ${inspectorToken}` },
    });
    assert(
      inspectorAccess.status === 403,
      "Scenario 11: Inspector role is blocked from applicant endpoints (403 Forbidden)"
    );

    // Scenario 12: A client cannot manipulate application status or ownership through request data
    const tamperRes = await fetch(`${baseUrl}/api/applications/${draft2Id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token2}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "APPROVED",
        applicantId: "000000000000000000000000",
        applicationId: "FNO-2099-TAMPERED",
      }),
    });
    const afterTamperGet = await fetch(`${baseUrl}/api/applications/${draft2Id}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const afterTamperData = await afterTamperGet.json();
    const appAfterTamper = afterTamperData.data?.application;
    assert(
      appAfterTamper.status === "DRAFT" && appAfterTamper.applicationId !== "FNO-2099-TAMPERED",
      "Scenario 12: Status and ownership manipulation attempts are ignored"
    );

    // Clean up test data
    await Application.deleteMany({ _id: { $in: [appId1, draft2Id] } });
    await User.deleteMany({ email: { $in: [testEmail1, testEmail2, testInspectorEmail] } });

    console.log(`\n========================================`);
    console.log(`All Tests Finished: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
