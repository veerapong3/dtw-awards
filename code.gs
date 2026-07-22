// กำหนดชื่อชีตที่ใช้งานในระบบ
const SHEETS = {
  RECORDS: "Records",
  SETTINGS: "Settings",
  USERS: "Users",
  STUDENTS: "Students",
  TEACHERS: "Teachers"
};

/**
 * ฟังก์ชันหลักเมื่อมีการเข้าลิงก์ Web Application
 */
function doGet() {
  initializeDatabase();
  
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('ระบบสถิติและผลงานครูและนักเรียน - โรงเรียนดอนตาลวิทยา')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสำหรับเริ่มต้นระบบ: สร้างตารางและข้อมูลตั้งต้นอัตโนมัติ
 */
function initializeDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ตรวจสอบและสร้างชีต "Records" (เก็บข้อมูลประวัติกิจกรรม)
  let recordsSheet = ss.getSheetByName(SHEETS.RECORDS);
  if (!recordsSheet) {
    recordsSheet = ss.insertSheet(SHEETS.RECORDS);
    const headers = [
      "ID", "Timestamp", "AcademicYear", "Term", "LearningArea", 
      "ActivityName", "Level", "StartDate", "EndDate", 
      "Location", "Province", "StudentsJSON", "TeachersJSON", 
      "ImageUrls", "CertificateUrl"
    ];
    recordsSheet.appendRow(headers);
    recordsSheet.getRange(1, 1, 1, headers.length)
                .setFontWeight("bold")
                .setBackground("#e2e8f0")
                .setHorizontalAlignment("center");
  }

  // 2. ตรวจสอบและสร้างชีต "Settings" (ระบบตั้งค่าตัวเลือกของแบบฟอร์ม)
  let settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
    const headers = ["SettingType", "Value"];
    settingsSheet.appendRow(headers);
    settingsSheet.getRange(1, 1, 1, headers.length)
                .setFontWeight("bold")
                .setBackground("#e2e8f0")
                .setHorizontalAlignment("center");
    
    // ใส่ข้อมูลตัวเลือกตั้งต้นสำหรับใช้งานครั้งแรก
    const defaultSettings = [
      ["AcademicYear", "2566"], ["AcademicYear", "2567"], ["AcademicYear", "2568"],
      ["Term", "1"], ["Term", "2"],
      ["LearningArea", "วิทยาศาสตร์และเทคโนโลยี"], ["LearningArea", "คณิตศาสตร์"], 
      ["LearningArea", "ภาษาไทย"], ["LearningArea", "ภาษาต่างประเทศ"],
      ["LearningArea", "ศิลปะ"], ["LearningArea", "สุขศึกษาและพลศึกษา"],
      ["LearningArea", "สังคมศึกษา ศาสนา และวัฒนธรรม"], ["LearningArea", "การงานอาชีพ"],
      ["Level", "ระดับเขตพื้นที่"], ["Level", "ระดับจังหวัด"], ["Level", "ระดับภาค"], ["Level", "ระดับชาติ"], ["Level", "ระดับนานาชาติ"],
      ["AwardLevel", "เหรียญทอง"], ["AwardLevel", "เหรียญเงิน"], ["AwardLevel", "เหรียญทองแดง"], ["AwardLevel", "เข้าร่วม"],
      ["AwardType", "ชนะเลิศ"], ["AwardType", "รองชนะเลิศอันดับ 1"], ["AwardType", "รองชนะเลิศอันดับ 2"], ["AwardType", "ไม่มีอันดับ"],
      ["HighStatsLevels", "ระดับชาติ"], ["HighStatsLevels", "ระดับนานาชาติ"]
    ];
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  }

  // 3. ตรวจสอบและสร้างชีต "Users" (สิทธิ์ผู้ดูแลระบบ)
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    const headers = ["Username", "Password", "FullName"];
    usersSheet.appendRow(headers);
    usersSheet.getRange(1, 1, 1, headers.length)
                .setFontWeight("bold")
                .setBackground("#e2e8f0")
                .setHorizontalAlignment("center");
    
    usersSheet.appendRow(["admin", "dtw12345", "ผู้ดูแลระบบ ดอนตาลวิทยา"]);
  }

  // 4. ตรวจสอบและสร้างชีต "Students" (รายชื่อนักเรียน)
  let studentsSheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet(SHEETS.STUDENTS);
    const headers = ["StudentID", "Prefix", "FullName", "Class"];
    studentsSheet.appendRow(headers);
    studentsSheet.getRange(1, 1, 1, headers.length)
                .setFontWeight("bold")
                .setBackground("#e2e8f0")
                .setHorizontalAlignment("center");
    
    const sampleStudents = [
      ["65001", "เด็กชาย", "สมชาย ดีใจ", "ม.1/1"],
      ["65002", "เด็กหญิง", "สมศรี แก้วกล้า", "ม.1/1"],
      ["65003", "นาย", "ดอนตาล รักเรียน", "ม.4/1"],
      ["65004", "นางสาว", "วิทยา พัฒนา", "ม.5/2"]
    ];
    sampleStudents.forEach(row => studentsSheet.appendRow(row));
  }

  // 5. ตรวจสอบและสร้างชีต "Teachers" (รายชื่อครูผู้สอน)
  let teachersSheet = ss.getSheetByName(SHEETS.TEACHERS);
  if (!teachersSheet) {
    teachersSheet = ss.insertSheet(SHEETS.TEACHERS);
    const headers = ["TeacherID", "Prefix", "FullName", "LearningArea"];
    teachersSheet.appendRow(headers);
    teachersSheet.getRange(1, 1, 1, headers.length)
                .setFontWeight("bold")
                .setBackground("#e2e8f0")
                .setHorizontalAlignment("center");
    
    const sampleTeachers = [
      ["T001", "นาย", "สมศักดิ์ รักสอน", "วิทยาศาสตร์และเทคโนโลยี"],
      ["T002", "นาง", "จันทร์เพ็ญ เรียนดี", "คณิตศาสตร์"],
      ["T003", "นางสาว", "อรทัย ใฝ่รู้", "ภาษาไทย"],
      ["T004", "นาย", "ไพโรจน์ ชำนาญงาน", "การงานอาชีพ"]
    ];
    sampleTeachers.forEach(row => teachersSheet.appendRow(row));
  }
}

/**
 * ดึงรายชื่อนักเรียนทั้งหมด
 */
function getStudentsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      studentId: data[i][0],
      prefix: data[i][1],
      fullName: data[i][2],
      className: data[i][3]
    });
  }
  return list;
}

/**
 * ดึงรายชื่อครูทั้งหมด
 */
function getTeachersList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TEACHERS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      teacherId: data[i][0],
      prefix: data[i][1],
      fullName: data[i][2],
      learningArea: data[i][3]
    });
  }
  return list;
}

/**
 * ตรวจสอบสิทธิ์การเข้าใช้งาน Admin Panel
 */
function authenticateUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return { 
        success: true, 
        user: { username: data[i][0], fullName: data[i][2] } 
      };
    }
  }
  return { success: false, message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" };
}

/**
 * ดึงค่าสำหรับการแสดงผลแบบฟอร์ม
 */
function getSystemSettings() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("system_settings");
  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  const settings = {
    AcademicYear: [], Term: [], LearningArea: [], Level: [], AwardLevel: [], AwardType: [], HighStatsLevels: []
  };

  for (let i = 1; i < data.length; i++) {
    const type = data[i][0];
    const val = data[i][1];
    if (settings[type]) {
      settings[type].push(val);
    }
  }
  
  cache.put("system_settings", JSON.stringify(settings), 600);
  return settings;
}

/**
 * อัปเดตตัวเลือกแบบฟอร์มของระบบ
 */
function updateSettings(settingsArray) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  sheet.clear();
  
  sheet.appendRow(["SettingType", "Value"]);
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e2e8f0");
  
  settingsArray.forEach(item => {
    sheet.appendRow([item.type, item.value]);
  });
  
  CacheService.getScriptCache().remove("system_settings");
  return { success: true };
}

/**
 * ตรวจสอบหรือสร้างโฟลเดอร์หลัก
 */
function getOrCreateParentFolder() {
  const parentFolderName = "DTW_Activity_Showcase";
  const folders = DriveApp.getFoldersByName(parentFolderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(parentFolderName);
  }
}

/**
 * ตรวจสอบหรือสร้างโฟลเดอร์ย่อยเฉพาะกิจกรรม
 */
function createEventFolder(parentFolder, startDate, activityName) {
  const cleanActivityName = activityName.replace(/[\/\\:*?"<>|]/g, "_");
  const folderName = `${startDate} - ${cleanActivityName}`;
  
  const existingFolders = parentFolder.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    return existingFolders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

/**
 * อัปโหลดรูปภาพกิจกรรม
 */
function uploadToDrive(base64Data, filename, targetFolder) {
  try {
    const contentType = base64Data.substring(5, base64Data.indexOf(';base64'));
    const bytes = Utilities.base64Decode(base64Data.substr(base64Data.indexOf('base64,') + 7));
    const blob = Utilities.newBlob(bytes, contentType, filename);
    
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    throw new Error("เกิดข้อผิดพลาดในการบันทึกภาพถ่าย: " + e.toString());
  }
}

/**
 * บันทึกหรือแก้ไขประวัติกิจกรรม (อัปเดตโฟลเดอร์เดิมอัตโนมัติ และล้างภาพขยะเมื่ออัปเดตรูปใหม่)
 */
function saveRecord(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.RECORDS);
    const data = sheet.getDataRange().getValues();
    
    let id = formData.id;
    let isUpdate = false;
    let rowIndex = -1;
    
    if (id) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          isUpdate = true;
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    if (!isUpdate) {
      id = "REC" + new Date().getTime();
    }
    
    const timestamp = isUpdate ? data[rowIndex - 1][1] : new Date();
    
    const parentFolder = getOrCreateParentFolder();
    let targetFolder;

    if (isUpdate && rowIndex !== -1) {
      // 1. กรณีเป็น "การแก้ไข": ค้นหาโฟลเดอร์ย่อยเดิมโดยอิงจากชื่อกิจกรรมและวันที่ก่อนแก้ไข
      const oldStartDate = data[rowIndex - 1][7];
      const oldActivityName = data[rowIndex - 1][5];
      const cleanOldActivityName = oldActivityName.replace(/[\/\\:*?"<>|]/g, "_");
      const oldFolderName = `${oldStartDate} - ${cleanOldActivityName}`;

      const existingFolders = parentFolder.getFoldersByName(oldFolderName);
      if (existingFolders.hasNext()) {
        targetFolder = existingFolders.next();
        
        // หากแอดมินแก้ไขชื่อกิจกรรมหรือวันที่แข่งขัน ให้ระบบทำการเปลี่ยนชื่อโฟลเดอร์ย่อยเดิมตามไปโดยไม่ต้องสร้างใหม่
        const cleanNewActivityName = formData.activityName.replace(/[\/\\:*?"<>|]/g, "_");
        const newFolderName = `${formData.startDate} - ${cleanNewActivityName}`;
        if (oldFolderName !== newFolderName) {
          targetFolder.setName(newFolderName);
        }
      } else {
        // หากไม่เจอโฟลเดอร์เดิม ให้สร้างขึ้นมาใหม่เพื่อป้องกันระบบทำงานติดขัด
        targetFolder = createEventFolder(parentFolder, formData.startDate, formData.activityName);
      }

      // 2. ลบภาพกิจกรรมชุดเดิมภายในโฟลเดอร์ออกก่อน หากแอดมินเลือกอัปโหลดรูปภาพกิจกรรมชุดใหม่เข้ามา
      if (formData.images && formData.images.length > 0) {
        const files = targetFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          if (file.getName().indexOf(`${id}_img_`) === 0) {
            file.setTrashed(true); // ย้ายลงถังขยะใน Drive เพื่อประหยัดพื้นที่คลาวด์
          }
        }
      }

      // 3. ลบรูปเกียรติบัตรชุดเดิม หากมีการส่งเกียรติบัตรชุดใหม่เข้ามาทับ
      if (formData.certificate && formData.certificate.base64) {
        const files = targetFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          if (file.getName().indexOf(`${id}_cert`) === 0) {
            file.setTrashed(true);
          }
        }
      }

    } else {
      // กรณีสร้างรายการใหม่ ให้สร้างโฟลเดอร์กิจกรรมขึ้นมาโดยตรง
      targetFolder = createEventFolder(parentFolder, formData.startDate, formData.activityName);
    }
    
    // อัปโหลดชุดภาพใหม่ลงโฟลเดอร์ที่เตรียมไว้
    let imageUrlsString = isUpdate ? data[rowIndex - 1][13] : "";
    if (formData.images && formData.images.length > 0) {
      const imageUrls = [];
      formData.images.forEach((img, index) => {
        const filename = `${id}_img_${index}_${new Date().getTime()}.jpg`;
        const url = uploadToDrive(img.base64, filename, targetFolder);
        imageUrls.push(url);
      });
      imageUrlsString = imageUrls.join(",");
    }
    
    let certUrl = isUpdate ? data[rowIndex - 1][14] : "";
    if (formData.certificate && formData.certificate.base64) {
      const certFilename = `${id}_cert_${new Date().getTime()}.jpg`;
      certUrl = uploadToDrive(formData.certificate.base64, certFilename, targetFolder);
    }

    const rowData = [
      id,
      timestamp,
      formData.academicYear,
      formData.term,
      formData.learningArea,
      formData.activityName,
      formData.level,
      formData.startDate,
      formData.endDate,
      formData.location,
      formData.province,
      JSON.stringify(formData.students),
      JSON.stringify(formData.teachers),
      imageUrlsString,
      certUrl
    ];

    if (isUpdate && rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    CacheService.getScriptCache().remove("public_records");
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ลบข้อมูลกิจกรรมออกจาก Google Sheets และนำโฟลเดอร์ใน Google Drive ลงถังขยะ
 */
function deleteRecord(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.RECORDS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        
        // 1. ดึงวันที่และชื่อกิจกรรมก่อนทำการลบเพื่อระบุโฟลเดอร์ย่อยใน Drive
        const startDate = data[i][7];
        const activityName = data[i][5];
        const cleanActivityName = activityName.replace(/[\/\\:*?"<>|]/g, "_");
        const folderName = `${startDate} - ${cleanActivityName}`;

        // 2. ค้นหาโฟลเดอร์กิจกรรมใน Drive และส่งย้ายโฟลเดอร์ลงถังขยะ (พร้อมขยะภาพถ่ายทั้งหมดข้างใน)
        const parentFolder = getOrCreateParentFolder();
        const subFolders = parentFolder.getFoldersByName(folderName);
        if (subFolders.hasNext()) {
          const targetFolder = subFolders.next();
          targetFolder.setTrashed(true); // ย้ายโฟลเดอร์และภาพกิจกรรมลงถังขยะทันที
        }

        // 3. ทำการลบแถวข้อมูลในสเปรดชีต
        sheet.deleteRow(i + 1);
        
        CacheService.getScriptCache().remove("public_records");
        return { success: true };
      }
    }
    return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบในระบบ" };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ดึงประวัติกิจกรรมการส่งผลงานทั้งหมด
 */
function getRecords(bypassCache) {
  const cache = CacheService.getScriptCache();
  
  if (bypassCache === true) {
    cache.remove("public_records");
  } else {
    const cached = cache.get("public_records");
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.RECORDS);
  const data = sheet.getDataRange().getValues();
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    records.push({
      id: data[i][0],
      timestamp: data[i][1],
      academicYear: data[i][2],
      term: data[i][3],
      learningArea: data[i][4],
      activityName: data[i][5],
      level: data[i][6],
      startDate: data[i][7],
      endDate: data[i][8],
      location: data[i][9],
      province: data[i][10],
      students: JSON.parse(data[i][11] || "[]"),
      teachers: JSON.parse(data[i][12] || "[]"),
      imageUrls: data[i][13] ? data[i][13].split(",") : [],
      certUrl: data[i][14] || ""
    });
  }
  
  records.reverse();
  cache.put("public_records", JSON.stringify(records), 300);
  return records;
}