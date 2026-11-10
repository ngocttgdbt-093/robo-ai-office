/**
 * Manual backup trial for the latest successful ROBO AI OFFICE branch artifact.
 * Store a repository-limited, Actions read-only GitHub token in Script Properties.
 */
function verifyGraphifyDrivePilot() {
  const properties = PropertiesService.getScriptProperties();
  const scheduledSource = properties.getProperty('GRAPHIFY_USE_MAIN') === 'true';
  const branch = scheduledSource ? 'main' : 'feat/graphify-drive-backup-20261110';
  const event = scheduledSource ? 'schedule' : 'push';
  const api = 'https://api.github.com/repos/ngocttgdbt-093/robo-ai-office/actions';
  const token = properties.getProperty('GRAPHIFY_GITHUB_READ_TOKEN');
  if (!token) throw new Error('Missing GRAPHIFY_GITHUB_READ_TOKEN in Script Properties.');

  const runs = graphifyGitHubJson(
    api + '/workflows/413434772/runs?status=success&per_page=1&event=' + event + '&branch=' + encodeURIComponent(branch),
    token
  );
  const run = runs.workflow_runs?.[0];
  if (run?.head_branch !== branch || run.conclusion !== 'success' || run.event !== event ||
      run.head_repository?.id !== 1448917996 || !Number.isSafeInteger(run.id) ||
      !/^[a-f0-9]{40}$/.test(run.head_sha)) {
    throw new Error('No successful Graphify run found on the approved branch.');
  }
  const artifacts = graphifyGitHubJson(api + '/runs/' + run.id + '/artifacts?per_page=100', token);
  const matches = artifacts.artifacts.filter(item => item.name === 'graphify-robo-' + run.head_sha && !item.expired);
  const artifact = matches[0];
  if (matches.length !== 1 || !Number.isSafeInteger(artifact.id) ||
      !Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes < 1 ||
      artifact.size_in_bytes > 20 * 1024 * 1024 || !/^sha256:[a-f0-9]{64}$/.test(artifact.digest)) {
    throw new Error('Expected one bounded, unexpired Graphify artifact with a SHA-256 digest.');
  }
  graphifyBackup(
    api + '/artifacts/' + artifact.id + '/zip',
    'graphify-robo-' + run.head_sha.slice(0, 12) + '-' + artifact.id + '.zip',
    artifact.digest.slice(7), artifact.size_in_bytes, token
  );
}

function graphifyGitHubHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function graphifyGitHubJson(url, token) {
  const response = graphifyFetch(url, {
    followRedirects: false,
    muteHttpExceptions: true,
    headers: graphifyGitHubHeaders(token),
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub artifact discovery failed (HTTP ' + response.getResponseCode() + ').');
  }
  return JSON.parse(response.getContentText());
}

function graphifyBackup(artifactUrl, name, expectedSha, expectedSize, token) {
  const folderId = '1q_DzAkxFveq1YS3nqbeOIfN958jHorqw';
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
      headers: graphifyGitHubHeaders(token),
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
    if (bytes.length !== expectedSize || graphifySha256(bytes) !== expectedSha) {
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
