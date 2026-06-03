<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { AuthResponse, BackendMode, RemoteSaveItem } from './types';

const storageKey = 'cloudSave.admin.settings';
const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<{ endpoint: string; username: string; mode: BackendMode | 'webdav' }>;

const form = reactive({
  mode: saved.mode === 'cloudflare' ? 'cloudflare' : ('go' as BackendMode),
  endpoint: saved.endpoint || '',
  username: saved.username || '',
  password: ''
});

const auth = reactive<Partial<AuthResponse>>({});
const saves = ref<RemoteSaveItem[]>([]);
const status = ref('等待操作。');
const busy = ref(false);

const endpoint = computed(() => form.endpoint.replace(/\/+$/, ''));
const isLoggedIn = computed(() => Boolean(auth.userId && auth.token));
const modeName = computed(() => (form.mode === 'go' ? 'Go + SQLite' : 'Cloudflare R2 + D1'));

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

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
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

async function health() {
  await run('健康检查', async () => {
    const data = await requestJson<{ ok: boolean }>('/health');
    setStatus(data.ok ? `${modeName.value} 在线。` : `${modeName.value} 返回异常。`);
  });
}

async function authAction(action: 'register' | 'login') {
  await run(action === 'register' ? '注册账号' : '登录账号', async () => {
    const data = await requestJson<AuthResponse>(`/auth/${action}`, {
      method: 'POST',
      body: JSON.stringify({ username: form.username, password: form.password })
    });
    Object.assign(auth, data);
    setStatus(`${action === 'register' ? '注册并登录' : '登录'}成功，token 有效至 ${new Date(data.expiresAt).toLocaleString()}。`);
    await listSaves(false);
  });
}

async function deleteAccount() {
  await run('删除账号', async () => {
    await requestJson('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password: form.password })
    });
    Object.assign(auth, { userId: undefined, username: undefined, token: undefined, expiresAt: undefined });
    saves.value = [];
    setStatus('账号已删除。');
  });
}

async function listSaves(wrap = true) {
  const task = async () => {
    saves.value = await requestJson<RemoteSaveItem[]>('/saves');
    setStatus(saves.value.length ? `读取到 ${saves.value.length} 个远端槽位。` : '当前账号没有远端槽位。');
  };
  if (wrap) await run('读取远端槽位', task);
  else await task();
}
</script>

<template>
  <main class="shell">
    <header>
      <div>
        <p class="eyebrow">Cloud Save Services</p>
        <h1>云服务管理面板</h1>
      </div>
      <span class="mode">{{ modeName }}</span>
    </header>

    <section class="panel">
      <div class="mode-tabs">
        <button :class="{ active: form.mode === 'go' }" type="button" @click="form.mode = 'go'">Go + SQLite</button>
        <button :class="{ active: form.mode === 'cloudflare' }" type="button" @click="form.mode = 'cloudflare'">Cloudflare</button>
      </div>

      <div class="form-grid">
        <label>
          <span>地址</span>
          <input v-model="form.endpoint" type="url" spellcheck="false" placeholder="http://局域网IP:8787 或 Worker URL" />
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

    <section class="panel">
      <div class="actions">
        <button type="button" :disabled="busy" @click="health">健康检查</button>
        <button type="button" :disabled="busy" @click="authAction('register')">注册</button>
        <button type="button" :disabled="busy" @click="authAction('login')">登录</button>
        <button type="button" :disabled="busy || !isLoggedIn" @click="listSaves()">读取槽位</button>
        <button class="danger" type="button" :disabled="busy || !isLoggedIn" @click="deleteAccount">删除账号</button>
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

    <section class="status" aria-live="polite">
      {{ status }}
    </section>
  </main>
</template>
