/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  theme: {
    setNativeTheme: (theme) => ipcRenderer.invoke('theme:setNativeTheme', theme),
    getNativeTheme: () => ipcRenderer.invoke('theme:getNativeTheme'),
    onGetNativeTheme: (callback) => {
      const callbackWithEventArg = (_, arg2) => callback(arg2)
      ipcRenderer.on('theme:getNativeTheme', callbackWithEventArg)
      return () => ipcRenderer.removeListener('theme:getNativeTheme', callbackWithEventArg)
    },
    onShouldUseDarkColors: (callback) => {
      const callbackWithEventArg = (_, arg2) => callback(arg2)
      ipcRenderer.on('theme:shouldUseDarkColors', callbackWithEventArg)
      return () => ipcRenderer.removeListener('theme:shouldUseDarkColors', callbackWithEventArg)
    }
  },
  updater: {
    checkForUpdates: async () => ipcRenderer.invoke('updater:checkForUpdates'),
    startUpdateDownload: () => ipcRenderer.invoke('updater:startUpdateDownload'),
    onUpdateDownloadProgress: (callback) => {
      const callbackWithEventArg = (_, arg2) => callback(arg2)
      ipcRenderer.on('updater:download-progress', callbackWithEventArg)
      return () => ipcRenderer.removeListener('updater:download-progress', callbackWithEventArg)
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('updater:updateDownloaded', callback)
      return () => ipcRenderer.removeListener('updater:updateDownloaded', callback)
    },
    quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quitAndInstallUpdate'),
    onError: (callback) => {
      const callbackWithEventArg = (_, arg2) => callback(arg2)
      ipcRenderer.on('updater:error', callbackWithEventArg)
      return () => ipcRenderer.removeListener('updater:error', callbackWithEventArg)
    }
  },
  walletConnect: {
    onSetDeepLinkUri: (callback) => {
      const callbackWithEventArg = (_, arg2) => callback(arg2)
      ipcRenderer.on('wc:setDeepLinkUri', callbackWithEventArg)
      return () => ipcRenderer.removeListener('wc:setDeepLinkUri', callbackWithEventArg)
    },
    hideApp: () => ipcRenderer.invoke('wc:hideApp')
  }
})
