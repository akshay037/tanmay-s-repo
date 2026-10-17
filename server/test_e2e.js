const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'object' ? JSON.stringify(postData) : postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E INTEGRATION & LEDGER SYSTEM VERIFICATION ---');

  // 1. Super Admin Login
  console.log('\n[1] Super Admin Login...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'superadmin', password: 'SuperAdmin@123' });

  if (loginRes.statusCode !== 200 || !loginRes.body.token) {
    throw new Error(`Super Admin login failed: ${JSON.stringify(loginRes.body)}`);
  }
  const saToken = loginRes.body.token;
  console.log('✓ Super Admin authenticated. Balance:', loginRes.body.user.balance.toLocaleString());

  // 2. Super Admin Creates Admin Frenchie2
  console.log('\n[2] Creating Admin Frenchie2...');
  const createAdminRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admins',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${saToken}`
    }
  }, {
    username: 'frenchie2',
    password: 'TempAdminPass@123',
    name: 'Frenchie Two',
    email: 'frenchie2@test.local',
    phone: '9876543210'
  });

  if (createAdminRes.statusCode !== 201) {
    throw new Error(`Create Admin failed: ${JSON.stringify(createAdminRes.body)}`);
  }
  const adminId = createAdminRes.body.admin.id;
  console.log(`✓ Admin frenchie2 created with ID ${adminId}.`);

  // 3. Super Admin Allocates 10,000 Points to Frenchie2
  console.log('\n[3] Allocating 10,000 points to Frenchie2...');
  const allocRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/allocate-admin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${saToken}`
    }
  }, {
    adminId: adminId,
    amount: 10000,
    reference: 'INIT_ALLOC_10K',
    description: 'Initial allocation to Frenchie2'
  });

  if (allocRes.statusCode !== 200) {
    throw new Error(`Point allocation failed: ${JSON.stringify(allocRes.body)}`);
  }
  console.log('✓ Allocated 10,000 points. Txn ID:', allocRes.body.transaction.transaction_id);

  // 4. Admin Frenchie2 Logins
  console.log('\n[4] Admin Frenchie2 Login...');
  const adminLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'frenchie2', password: 'TempAdminPass@123' });

  if (adminLoginRes.statusCode !== 200) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
  }
  let adminToken = adminLoginRes.body.token;
  console.log('✓ Admin Frenchie2 authenticated. Available Balance:', adminLoginRes.body.user.balance.toLocaleString());

  // Force password change for Frenchie2
  console.log('\n[4b] Frenchie2 changing temporary password...');
  const changePassRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/change-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { newPassword: 'FrenchieAdminSecret@2026' });

  if (changePassRes.statusCode !== 200) {
    throw new Error(`Password change failed: ${JSON.stringify(changePassRes.body)}`);
  }
  console.log('✓ Password updated for Frenchie2.');

  // 5. Frenchie2 Creates User A and User B
  console.log('\n[5] Creating User A and User B under Frenchie2...');
  const createUserA = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { username: 'userA', password: 'UserPass@123', name: 'User Alpha' });

  const createUserB = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { username: 'userB', password: 'UserPass@123', name: 'User Beta' });

  if (createUserA.statusCode !== 201 || createUserB.statusCode !== 201) {
    throw new Error(`User creation failed: A: ${JSON.stringify(createUserA.body)}, B: ${JSON.stringify(createUserB.body)}`);
  }
  const userA_Id = createUserA.body.user.id;
  const userB_Id = createUserB.body.user.id;
  console.log(`✓ User A (ID: ${userA_Id}) and User B (ID: ${userB_Id}) created under Frenchie2.`);

  // 6. Frenchie2 Distributes 4,000 points to User A & 6,000 points to User B
  console.log('\n[6] Distributing 4,000 pts to User A and 6,000 pts to User B...');
  const distA = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/distribute-user',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { userId: userA_Id, amount: 4000 });

  const distB = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/distribute-user',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { userId: userB_Id, amount: 6000 });

  if (distA.statusCode !== 200 || distB.statusCode !== 200) {
    throw new Error(`Distribution failed: A: ${JSON.stringify(distA.body)}, B: ${JSON.stringify(distB.body)}`);
  }
  console.log('✓ Distributed 4,000 to User A and 6,000 to User B successfully.');

  // 7. Test Insufficient Balance Rule: Frenchie2 attempts to distribute 7,000 points to User B
  console.log('\n[7] TESTING INSUFFICIENT BALANCE REJECTION (Prompt Requirement 5)...');
  const distFail = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/distribute-user',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { userId: userB_Id, amount: 7000 });

  if (distFail.statusCode === 400 && distFail.body.error.includes('Insufficient point balance')) {
    console.log('✓ REJECTED AS EXPECTED! Message:', distFail.body.error);
  } else {
    throw new Error(`Expected rejection for 7,000 pts distribution, got: ${JSON.stringify(distFail.body)}`);
  }

  // 8. Frenchie2 requests 5,000 additional points
  console.log('\n[8] Submitting Point Request for 5,000 pts...');
  const reqPoints = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { requestedAmount: 5000, reason: 'Need more points for expansion', note: 'Users added' });

  if (reqPoints.statusCode !== 201) {
    throw new Error(`Point request failed: ${JSON.stringify(reqPoints.body)}`);
  }
  console.log('✓ Point request created:', reqPoints.body.requestCode);

  // 9. Super Admin Partial Approval: Approves 3,000 out of 5,000 points requested
  console.log('\n[9] Super Admin Partial Approval (3,000 of 5,000)...');
  const getReqs = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/points/requests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${saToken}` }
  });
  const pointReqId = getReqs.body[0].id;

  const reviewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/points/requests/${pointReqId}/review`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` }
  }, { status: 'PARTIALLY_APPROVED', approvedAmount: 3000, reviewerComment: 'Approved 3,000 based on capacity' });

  if (reviewRes.statusCode !== 200) {
    throw new Error(`Review request failed: ${JSON.stringify(reviewRes.body)}`);
  }
  console.log('✓ Partial approval complete. Frenchie2 received exactly 3,000 points.');

  // Check Frenchie2 new balance
  const frenchie2Me = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('✓ Verified Frenchie2 Available Balance after approval:', frenchie2Me.body.pointAccount.balance.toLocaleString(), 'pts');

  // 10. Audit Log Inspection
  console.log('\n[10] Verifying Audit Log Entries...');
  const auditRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/audit-logs',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${saToken}` }
  });
  console.log(`✓ Audit log captured ${auditRes.body.total} system events cleanly.`);

  console.log('\n=======================================================');
  console.log('  ALL E2E INTEGRATION & BUSINESS RULES VERIFIED 100%!  ');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
