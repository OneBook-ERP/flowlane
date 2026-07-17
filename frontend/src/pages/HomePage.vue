<script setup>
// Client Home (S1): a folder-tile grid of clients + New Client. The grid reads
// the shared `clients` resource (data/clients.js); create/rename/delete reload it.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, toast } from 'frappe-ui'
import { clients, renameClient, deleteClient } from '@/data/clients.js'
import { serverMessage } from '@/data/errors.js'
import ClientTile from '@/components/ClientTile.vue'
import NewClientDialog from '@/components/NewClientDialog.vue'
import RenameDialog from '@/components/RenameDialog.vue'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'

const router = useRouter()

const showNew = ref(false)
const renameTarget = ref(null)
const deleteTarget = ref(null)
const busy = ref(false)

function openClient(client) {
  router.push({ name: 'ClientWorkspace', params: { client: client.name } })
}

async function submitRename(newName) {
  busy.value = true
  try {
    await renameClient(renameTarget.value.name, newName)
    toast.success('Client renamed.')
    renameTarget.value = null
    clients.reload()
  } catch (error) {
    toast.error(serverMessage(error))
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  busy.value = true
  try {
    await deleteClient(deleteTarget.value.name)
    toast.success('Client deleted.')
    deleteTarget.value = null
    clients.reload()
  } catch (error) {
    toast.error(serverMessage(error))
    deleteTarget.value = null
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto">
    <header class="flex items-center justify-between px-8 py-5">
      <div class="flex items-center gap-2">
        <span class="text-xl">🛤️</span>
        <h1 class="text-xl font-semibold text-ink-gray-9">Flowlane</h1>
      </div>
      <Button variant="solid" @click="showNew = true">New Client</Button>
    </header>

    <main class="flex-1 px-8 pb-10">
      <div
        v-if="clients.data && clients.data.length"
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <ClientTile
          v-for="client in clients.data"
          :key="client.name"
          :client="client"
          @open="openClient"
          @rename="renameTarget = $event"
          @delete="deleteTarget = $event"
        />
      </div>

      <div
        v-else-if="clients.data"
        class="flex flex-col items-center justify-center gap-3 py-24 text-center"
      >
        <div class="text-4xl">📁</div>
        <p class="text-base font-medium text-ink-gray-8">No clients yet</p>
        <p class="max-w-sm text-sm text-ink-gray-5">
          Create your first client folder to start mapping their processes.
        </p>
        <Button variant="solid" @click="showNew = true">New Client</Button>
      </div>
    </main>

    <NewClientDialog v-model="showNew" @created="clients.reload()" />
    <RenameDialog
      :modelValue="Boolean(renameTarget)"
      title="Rename Client"
      label="Client Name"
      :value="renameTarget?.client_name || ''"
      :saving="busy"
      @update:modelValue="renameTarget = null"
      @submit="submitRename"
    />
    <ConfirmDeleteDialog
      :modelValue="Boolean(deleteTarget)"
      title="Delete Client"
      :message="`Delete “${deleteTarget?.client_name}”? This cannot be undone.`"
      :saving="busy"
      @update:modelValue="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
