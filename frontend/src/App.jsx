import React, { useState, useEffect, useRef } from 'react'
import { Tabs, Button, Input, Upload, List, Modal, Select, message } from 'antd'
import { UploadOutlined, DeleteOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons'
import './App.css'

function App() {
  // 页面切换：main=主功能，key=API Key管理
  const [page, setPage] = useState('main')
  const [activeTab, setActiveTab] = useState('1') // 新增：当前激活的选项卡

  // DeepSeek Key管理
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)

  // 多轮对话
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState(() => {
    // 支持刷新页面后历史保留
    const saved = localStorage.getItem('ds_messages')
    return saved ? JSON.parse(saved) : []
  })
  const chatEndRef = useRef(null)

  // 其它原有状态
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [groups, setGroups] = useState([])
  const [groupFilter, setGroupFilter] = useState('全部')
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameTarget, setRenameTarget] = useState('')
  const [showGroup, setShowGroup] = useState(false)
  const [groupValue, setGroupValue] = useState('')
  const [groupTarget, setGroupTarget] = useState('')
  // 新增：问答分组选择
  const [qaGroup, setQaGroup] = useState('全部')

  // 获取文件列表
  const fetchFiles = async () => {
    try {
      const res = await fetch('http://localhost:8004/files/')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (err) {
      setFiles([])
    }
  }

  // 获取所有分组
  const fetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:8004/groups/')
      const data = await res.json()
      setGroups(['全部', ...Object.keys(data.groups || {})])
    } catch (err) {
      setGroups(['全部'])
    }
  }

  useEffect(() => {
    fetchFiles()
    fetchGroups()
  }, [])

  // 多轮对话历史本地存储
  useEffect(() => {
    localStorage.setItem('ds_messages', JSON.stringify(messages))
    // 滚动到底部
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 上传文件
  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setText('')
    setError('')
    setSelectedFile(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('请先选择文件')
      return
    }
    setLoading(true)
    setError('')
    setText('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:8004/upload/', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setText(data.text)
        setSelectedFile(data.filename)
        fetchFiles()
        fetchGroups()
      }
    } catch (err) {
      setError('上传失败，请检查后端服务是否启动')
    }
    setLoading(false)
  }

  // AI多轮对话
  const handleAsk = async () => {
    if (!question.trim()) return
    setAiLoading(true)
    setError('')
    const newMessage = { role: 'user', content: question }
    setMessages([...messages, newMessage])
    setQuestion('')
    try {
      const body = { messages: [newMessage] }
      if (qaGroup && qaGroup !== '全部') body.group = qaGroup
      const res = await fetch('http://localhost:8004/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.answer) {
        setMessages(msgs => [...msgs, { 
          role: 'assistant', 
          content: data.answer,
          source_files: data.source_files // 使用新的source_files字段
        }])
      } else {
        setError(data.error || 'AI未返回答案')
      }
    } catch (err) {
      setError('AI问答请求失败，请检查后端服务')
    }
    setAiLoading(false)
  }

  // 清空对话
  const handleClearChat = () => {
    setMessages([])
    setError('')
    setQuestion('')
  }

  // 点击文件名查看内容
  const handleSelectFile = async (filename) => {
    setSelectedFile(filename)
    setText('')
    setAnswer('')
    setError('')
    setLoading(true)
    try {
      // 复用上传接口逻辑，后端暂未提供单独读取接口，临时方案：重新上传文件（可优化）
      // 实际应有单独的读取接口
      const res = await fetch('http://localhost:8004/upload/', {
        method: 'POST',
        body: (() => { const f = new FormData(); f.append('file', new File([], filename)); return f })(),
      })
      const data = await res.json()
      if (data.text) {
        setText(data.text)
      } else {
        setError('无法读取文件内容')
      }
    } catch (err) {
      setError('读取文件内容失败')
    }
    setLoading(false)
  }

  // 删除文件
  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`确定要删除文件：${filename} 吗？`)) return
    try {
      const res = await fetch(`http://localhost:8004/delete/?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setFiles(files.filter(f => f.filename !== filename))
        if (selectedFile === filename) {
          setSelectedFile(null)
          setText('')
          setAnswer('')
        }
        fetchGroups()
      } else {
        setError(data.error || '删除失败')
      }
    } catch (err) {
      setError('删除文件失败')
    }
  }

  // 打开重命名弹窗
  const openRename = (filename) => {
    setRenameTarget(filename)
    setRenameValue(filename)
    setShowRename(true)
  }

  // 提交重命名
  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === renameTarget) {
      setShowRename(false)
      return
    }
    try {
      const res = await fetch(`http://localhost:8004/rename/?old_name=${encodeURIComponent(renameTarget)}&new_name=${encodeURIComponent(renameValue)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setShowRename(false)
        setRenameTarget('')
        setRenameValue('')
        fetchFiles()
        fetchGroups()
        if (selectedFile === renameTarget) {
          setSelectedFile(renameValue)
        }
      } else {
        setError(data.error || '重命名失败')
      }
    } catch (err) {
      setError('重命名失败')
    }
  }

  // 打开分组弹窗
  const openGroup = (filename) => {
    setGroupTarget(filename)
    setGroupValue('')
    setShowGroup(true)
  }

  // 提交分组
  const handleGroup = async () => {
    if (!groupValue.trim()) {
      setShowGroup(false)
      return
    }
    try {
      const res = await fetch(`http://localhost:8004/group/?filename=${encodeURIComponent(groupTarget)}&group=${encodeURIComponent(groupValue)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setShowGroup(false)
        setGroupTarget('')
        setGroupValue('')
        fetchFiles()
        fetchGroups()
      } else {
        setError(data.error || '分组失败')
      }
    } catch (err) {
      setError('分组失败')
    }
  }

  // 分组筛选
  const filteredFiles = groupFilter === '全部' ? files : files.filter(f => f.group === groupFilter)

  // DeepSeek Key设置与测试
  const handleKeyTest = async () => {
    setKeyStatus('')
    setKeyLoading(true)
    try {
      const formData = new FormData()
      formData.append('key', apiKey)
      const res = await fetch('http://localhost:8004/test_deepseek_key/', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setKeyStatus('API Key 测试通过！')
      } else {
        setKeyStatus(data.error || 'API Key 测试失败')
      }
    } catch (err) {
      setKeyStatus('API Key 测试失败')
    }
    setKeyLoading(false)
  }

  const handleKeySave = async () => {
    setKeyStatus('')
    setKeyLoading(true)
    try {
      const formData = new FormData()
      formData.append('key', apiKey)
      const res = await fetch('http://localhost:8004/set_deepseek_key/', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setKeyStatus('API Key 已保存！')
      } else {
        setKeyStatus(data.error || 'API Key 保存失败')
      }
    } catch (err) {
      setKeyStatus('API Key 保存失败')
    }
    setKeyLoading(false)
  }

  // 渲染消息
  const renderMessage = (msg, index) => {
    return (
      <div key={index} className={`message ${msg.role}`}>
        <div className="message-content">
          {msg.content}
          {msg.role === 'assistant' && msg.source_files && (
            <div className="message-source">
              来源文件：{Array.isArray(msg.source_files) ? msg.source_files.join(', ') : msg.source_files}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 主界面内容
  const renderMainContent = () => (
    <div className="container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '1',
            label: '文件管理',
            children: (
              <div className="file-section">
                <div className="upload-section">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="upload-button">
                    选择文件
                  </label>
                  {file && <span className="file-name">{file.name}</span>}
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={loading}
                    disabled={!file}
                  >
                    上传
                  </Button>
                </div>

                <Select
                  style={{ width: 200, marginBottom: 16 }}
                  value={groupFilter}
                  onChange={setGroupFilter}
                >
                  {groups.map(g => (
                    <Select.Option key={g} value={g}>{g}</Select.Option>
                  ))}
                </Select>

                <List
                  className="file-list"
                  dataSource={files.filter(f => 
                    groupFilter === '全部' || f.group === groupFilter
                  )}
                  renderItem={file => (
                    <List.Item
                      actions={[
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => openRename(file.filename)}
                        />,
                        <Button
                          icon={<FolderOutlined />}
                          onClick={() => openGroup(file.filename)}
                        />,
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteFile(file.filename)}
                          danger
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <a onClick={() => handleSelectFile(file.filename)}>
                            {file.filename}
                          </a>
                        }
                        description={file.group || '未分组'}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )
          },
          {
            key: '2',
            label: '问答对话',
            children: (
              <div className="chat-section">
                {/* 新增：分组选择 */}
                <div style={{ marginBottom: 12 }}>
                  <Select
                    style={{ width: 200 }}
                    value={qaGroup}
                    onChange={setQaGroup}
                  >
                    {groups.map(g => (
                      <Select.Option key={g} value={g}>{g}</Select.Option>
                    ))}
                  </Select>
                  <span style={{ marginLeft: 8, color: '#888' }}>
                    选择分组后仅检索该分组文档，选择"全部"则全库检索
                  </span>
                </div>
                <div className="messages">
                  {messages.map((msg, index) => renderMessage(msg, index))}
                  <div ref={chatEndRef} />
                </div>
                <div className="input-section">
                  <Input.TextArea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="请输入您的问题..."
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAsk()
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={handleAsk}
                    loading={aiLoading}
                    disabled={!question.trim()}
                  >
                    发送
                  </Button>
                  <Button onClick={handleClearChat}>清空对话</Button>
                </div>
                {error && <div className="error">{error}</div>}
              </div>
            )
          }
        ]}
      />

      {/* 重命名弹窗 */}
      <Modal
        title="重命名文件"
        open={showRename}
        onOk={handleRename}
        onCancel={() => setShowRename(false)}
      >
        <Input
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          placeholder="请输入新文件名"
        />
      </Modal>

      {/* 分组弹窗 */}
      <Modal
        title="设置分组"
        open={showGroup}
        onOk={handleGroup}
        onCancel={() => setShowGroup(false)}
      >
        <Input
          value={groupValue}
          onChange={e => setGroupValue(e.target.value)}
          placeholder="请输入分组名称"
        />
      </Modal>
    </div>
  )

  return (
    <div className="app">
      <div className="header">
        <h1>智能文档管理与AI总结工具</h1>
        <div className="nav">
          <span
            className={page === 'main' ? 'active' : ''}
            onClick={() => setPage('main')}
          >
            主功能
          </span>
          <span
            className={page === 'key' ? 'active' : ''}
            onClick={() => setPage('key')}
          >
            API Key管理
          </span>
        </div>
      </div>

      {page === 'main' ? (
        renderMainContent()
      ) : (
        <div className="key-management">
          <Input.Password
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="请输入DeepSeek API Key"
            style={{ width: 300 }}
          />
          <Button
            type="primary"
            onClick={handleKeyTest}
            loading={keyLoading}
          >
            测试
          </Button>
          <Button onClick={handleKeySave}>保存</Button>
          <span className="key-status">{keyStatus}</span>
        </div>
      )}
    </div>
  )
}

export default App
