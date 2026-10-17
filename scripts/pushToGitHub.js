const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const repoDir = path.resolve(__dirname, '..');

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log('🚀 PUSH CAPSTONE REPOSITORY TO GITHUB / GITLAB');
  console.log('====================================================\n');

  let remoteUrl = process.argv[2];
  let token = process.argv[3];

  if (!remoteUrl) {
    remoteUrl = await prompt('Enter your GitHub/GitLab Repository URL (e.g. https://github.com/username/repo.git):\n> ');
  }

  if (!remoteUrl) {
    console.error('❌ Repository URL is required.');
    process.exit(1);
  }

  if (!token) {
    token = await prompt('Enter your GitHub Personal Access Token (classic token with "repo" scope):\n> ');
  }

  if (!token) {
    console.error('❌ Personal Access Token is required to authenticate with remote git.');
    process.exit(1);
  }

  try {
    console.log(`\nConfiguring remote 'origin' -> ${remoteUrl}...`);
    try {
      await git.deleteRemote({ fs, dir: repoDir, remote: 'origin' });
    } catch (e) {
      // Remote might not exist yet
    }
    await git.addRemote({ fs, dir: repoDir, remote: 'origin', url: remoteUrl });

    console.log('Pushing branch "main" to remote repository (with force overwrite)...');
    const pushResult = await git.push({
      fs,
      http,
      dir: repoDir,
      remote: 'origin',
      ref: 'main',
      force: true,
      onAuth: () => ({
        username: token, // GitHub accepts token as username or password
        password: '',
      }),
    });

    console.log('\n✅ PUSH SUCCESSFUL!');
    console.log('Your repository with all 7 structured commits is now live on GitHub!');
    console.log(`Repository: ${remoteUrl}\n`);
  } catch (error) {
    console.error('\n❌ Push failed:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
    console.log('\nTip: Make sure you created an empty GitHub repository (without README or license initialization).');
  }
}

main();
