/**
 * Manual backup trial for one verified ROBO AI OFFICE artifact.
 * Store a repository-limited, Actions read-only GitHub token in Script Properties.
 */
function verifyGraphifyDrivePilot() {
  const folderId = '1q_DzAkxFveq1YS3nqbeOIfN958jHorqw';
  const artifactUrl = 'https://api.github.com/repos/ngocttgdbt-093/robo-ai-office/actions/artifacts/13784845527/zip';
  const name = 'graphify-robo-469a435dcd9e-apps-script-pilot.zip';
  const expectedSha = '824da9ffbbfb15fc2a24e824c5d8b699f2a75bf6bf39f4088edc3d03957b75ef';
  const token = PropertiesService.getScriptProperties().getProperty('GRAPHIFY_GITHUB_READ_TOKEN');
  if (!token) throw new Error('Missing GRAPHIFY_GITHUB_READ_TOKEN in Script Properties.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('A Graphify backup is already running.');
  try {
    const folder = DriveApp.getFolderById(folderId);
    const existing = folder.getFilesByName(name);
    if (existing.hasNext()) {
      const saved = existing.next();
      if (existing.hasNext() || graphifySha256(saved.getBlob().getBytes()) !== expectedSha) {
        throw new Error('Existing Drive snapshot is ambiguous or has an unexpected SHA-256.');
      }
      console.log('Existing Drive snapshot verified by SHA-256.');
      return;
    }

    const response = graphifyFetch(artifactUrl, {
      followRedirects: false,
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (response.getResponseCode() !== 302) {
      throw new Error('GitHub artifact request failed (HTTP ' + response.getResponseCode() + ').');
    }
    const headers = response.getAllHeaders();
    const location = headers.Location || headers.location;
    if (typeof location !== 'string' || !/^https:\/\/[a-z0-9.-]+\.(?:blob\.core\.windows\.net|actions\.githubusercontent\.com|githubusercontent\.com)\//i.test(location)) {
      throw new Error('Unexpected GitHub artifact redirect.');
    }

    // Signed URL only. The GitHub token never leaves api.github.com.
    const download = graphifyFetch(location, {followRedirects: false, muteHttpExceptions: true});
    if (download.getResponseCode() !== 200) {
      throw new Error('Artifact download failed (HTTP ' + download.getResponseCode() + ').');
    }
    const bytes = download.getContent();
    if (bytes.length !== 28876 || graphifySha256(bytes) !== expectedSha) {
      throw new Error('Downloaded artifact does not match GitHub size and SHA-256.');
    }

    const file = folder.createFile(Utilities.newBlob(bytes, 'application/zip', name));
    if (graphifySha256(file.getBlob().getBytes()) !== expectedSha) {
      throw new Error('Drive SHA-256 verification failed.');
    }
    console.log('Verified Graphify ZIP on Drive: ' + bytes.length + ' bytes, SHA-256 ' + expectedSha);
  } finally {
    lock.releaseLock();
  }
}

function graphifyFetch(url, options) {
  try {
    return UrlFetchApp.fetch(url, options);
  } catch (_) {
    throw new Error('Artifact fetch failed before receiving an HTTP response.');
  }
}

function graphifySha256(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(value => ('0' + ((value + 256) % 256).toString(16)).slice(-2))
    .join('');
}
