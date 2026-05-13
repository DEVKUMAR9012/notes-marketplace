import React, { useState, useEffect, useCallback } from 'react';
import { FiMessageSquare, FiSearch, FiTrash2 } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Avatar, Btn, ConfirmationModal, fmtDateTime } from './SharedAdminUI';

const LiveChatsTab = () => {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const msgText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.text || val.content || val.message || '';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/admin/chats');
        setConversations(res.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const loadMessages = useCallback(async (conv) => {
    setSelected(conv);
    setMsgLoading(true);
    try {
      const res = await API.get(`/admin/chats/${conv._id}/messages`);
      setMessages(res.data || []);
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  }, []);

  const deleteConversation = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/chats/${confirmDelete.id}`);
      setConversations(c => c.filter(x => x._id !== confirmDelete.id));
      if (selected?._id === confirmDelete.id) { setSelected(null); setMessages([]); }
      setConfirmDelete(null);
    } catch { }
  }, [confirmDelete, selected]);

  const filtered = conversations.filter(c =>
    !search || c.participants?.some(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 pt-4">
      <SectionHeader icon={FiMessageSquare} iconColor="bg-cyan-500/20 text-cyan-400" title="Live Chat Monitor"
        subtitle="Read all conversations between users on the platform" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[600px]">
        {/* Conversation List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.07]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? [...Array(5)].map((_, i) => <div key={i} className="p-4"><Shimmer className="h-10" /></div>) :
              filtered.map(conv => (
                <div key={conv._id} onClick={() => loadMessages(conv)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-white/[0.04] hover:bg-white/[0.04] transition text-left cursor-pointer group ${selected?._id === conv._id ? 'bg-violet-500/10' : ''}`}>
                  <div className="flex -space-x-2">
                    {conv.participants?.slice(0, 2).map((p) => <Avatar key={p._id || p.name} name={p.name} src={p.avatar} size={8} />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {conv.participants?.map(p => p.name).join(' & ')}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{msgText(conv.lastMessage) || 'No messages'}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: conv._id, name: conv.participants?.map(p => p.name).join(' & ') }); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-transparent group-hover:text-gray-500 hover:!text-red-400 transition">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-600">
              <FiMessageSquare size={40} />
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/[0.07] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selected.participants?.slice(0, 2).map((p) => <Avatar key={p._id} name={p.name} src={p.avatar} size={8} />)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{selected.participants?.map(p => p.name).join(' & ')}</p>
                    <p className="text-gray-500 text-xs">{messages.length} messages · Read-only view</p>
                  </div>
                </div>
                <Btn variant="danger" size="xs" icon={FiTrash2} onClick={() => setConfirmDelete({ id: selected._id, name: selected.participants?.map(p => p.name).join(' & ') })}>Delete</Btn>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-14" />) :
                  messages.length === 0 ? <p className="text-gray-600 text-sm text-center py-12">No messages in this conversation.</p> :
                    messages.map((msg) => {
                      const isSender = msg.sender?._id === selected.participants?.[0]?._id;
                      return (
                        <div key={msg._id} className={`flex gap-3 ${isSender ? '' : 'flex-row-reverse'}`}>
                          <Avatar name={msg.sender?.name} src={msg.sender?.avatar} size={7} />
                          <div className={`max-w-xs ${isSender ? '' : 'items-end'} flex flex-col gap-1`}>
                            <p className="text-gray-500 text-xs">{msg.sender?.name}</p>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isSender ? 'bg-white/10 text-gray-200 rounded-tl-none' : 'bg-violet-600/30 text-violet-100 rounded-tr-none'}`}>
                              {msgText(msg)}
                            </div>
                            <p className="text-gray-600 text-xs">{fmtDateTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteConversation}
        title="Delete Conversation"
        message={`Are you sure you want to delete the conversation with ${confirmDelete?.name}?`}
        confirmText={confirmDelete?.name}
      />
    </div>
  );
};

export default LiveChatsTab;
