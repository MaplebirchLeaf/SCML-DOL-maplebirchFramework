<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { BackendMode, AuthResponse, RemoteSaveItem } from 'types';

const storageKey = 'cloudSave.admin.settings';
const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<{ endpoint: string; username: string; mode: BackendMode }>;

const form = reactive({
  mode: saved.mode || ('go' as BackendMode),
  endpoint: saved.endpoint || '',
  username: saved.username || '',
  password: ''
});

const auth = reactive<Partial<AuthResponse>>({});
const saves = ref<RemoteSaveItem[]>([]);
const manifestText = ref('');
const status = ref('等待操作。');
const busy = ref(false);

const endpoint = computed(() => form.endpoint.replace(/\/+$/, ''));
const isLoggedIn = computed(() => Boolean(auth.userId && auth.token));

function remember() {
  localStorage.setItem(storageKey, JSON.stringify({ mode: form.mode, endpoint: form.endpoint, username: form.username }));
}

function setStatus(message: string) {
  status.value = message;
}

async function run(label: string, task: () => Promise<void>) {
  busy.value = true;
  setStatus(`${label}...`);
  try {
    remember();
    await task();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  } finally {
    busy.value = false;
  }
}

async function jsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${endpoint.value}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.userId ? { 'X-Cloud-Save-User': String(auth.userId) } : {}),
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

async function goHealth() {
  await run('检查 Go 后端', async () => {
    const data = await jsonRequest<{ ok: boolean }>('/health');
    setStatus(data.ok ? 'Go 后端在线。' : 'Go 后端返回异常。');
  });
}

async function goAuth(action: 'register' | 'login') {
  await run(action === 'register' ? '注册账号' : '登录账号', async () => {
    const data = await jsonRequest<AuthResponse>(`/auth/${action}`, {
      method: 'POST',
      body: JSON.stringify({ username: form.username, password: form.password })
    });
    Object.assign(auth, data);
    setStatus(`${action === 'register' ? '注册并登录' : '登录'}成功，token 有效至 ${new Date(data.expiresAt).toLocaleString()}。`);
    await goList(false);
  });
}

async function goList(wrap = true) {
  const task = async () => {
    saves.value = await jsonRequest<RemoteSaveItem[]>('/saves');
    setStatus(saves.value.length ? `读取到 ${saves.value.length} 个远端槽位。` : '当前账号没有远端槽位。');
  };
  if (wrap) await run('读取 Go 远端槽位', task);
  else await task();
}

function basicAuthHeader() {
  const bytes = new TextEncoder().encode(`${form.username}:${form.password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

async function webdavRequest(path: string, init: RequestInit = {}) {
  return await fetch(`${endpoint.value}/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(),
      ...init.headers
    }
  });
}

async function webdavInit() {
  await run('初始化 WebDAV/R2', async () => {
    const response = await webdavRequest('slots', { method: 'MKCOL' });
    if (![200, 201, 204, 405].includes(response.status)) throw new Error(`${response.status} ${await response.text()}`);
    setStatus('WebDAV/R2 可写入，slots/ 已就绪。');
  });
}

async function webdavManifest() {
  await run('读取 manifest', async () => {
    const response = await webdavRequest('manifest.json');
    if (response.status === 404) {
      manifestText.value = '';
      setStatus('manifest.json 还不存在，先在游戏里上传一次槽位。');
      return;
    }
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
    manifestText.value = JSON.stringify(await response.json(), null, 2);
    setStatus('manifest.json 读取成功。');
  });
}
</script>

<template>
  <main class="shell">
    <header>
      <div>
        <p class="eyebrow">Cloud Save Services</p>
        <h1>云服务管理面板</h1>
      </div>
      <span class="mode">{{ form.mode === 'go' ? 'Go + SQLite' : 'WebDAV / R2' }}</span>
    </header>

    <section class="panel">
      <div class="mode-tabs">
        <button :class="{ active: form.mode === 'go' }" type="button" @click="form.mode = 'go'">Go + SQLite</button>
        <button :class="{ active: form.mode === 'webdav' }" type="button" @click="form.mode = 'webdav'">WebDAV / R2</button>
      </div>

      <div class="form-grid">
        <label>
          <span>地址</span>
          <input v-model="form.endpoint" type="url" spellcheck="false" placeholder="https://..." />
        </label>
        <label>
          <span>账号</span>
          <input v-model="form.username" type="text" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" />
        </label>
      </div>
    </section>

    <section v-if="form.mode === 'go'" class="panel">
      <div class="actions">
        <button type="button" :disabled="busy" @click="goHealth">健康检查</button>
        <button type="button" :disabled="busy" @click="goAuth('register')">注册</button>
        <button type="button" :disabled="busy" @click="goAuth('login')">登录</button>
        <button type="button" :disabled="busy || !isLoggedIn" @click="goList()">读取槽位</button>
      </div>
      <div class="table">
        <div class="row head">
          <span>槽位</span>
          <span>更新时间</span>
        </div>
        <div v-for="item in saves" :key="item.slot" class="row">
          <span>{{ item.slot }}</span>
          <span>{{ new Date(item.updatedAt).toLocaleString() }}</span>
        </div>
        <p v-if="!saves.length" class="empty">尚未读取到远端槽位。</p>
      </div>
    </section>

    <section v-else class="panel">
      <div class="actions">
        <button type="button" :disabled="busy" @click="webdavInit">初始化 slots/</button>
        <button type="button" :disabled="busy" @click="webdavManifest">读取 manifest</button>
      </div>
      <pre class="manifest">{{ manifestText || 'manifest.json 会显示在这里。' }}</pre>
    </section>

    <section class="status" aria-live="polite">
      {{ status }}
    </section>
  </main>
</template>
