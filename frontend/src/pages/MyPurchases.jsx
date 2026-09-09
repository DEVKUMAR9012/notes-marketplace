import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import PDFThumbnail from '../components/PDFThumbnail';
import {
  FiDownload,
  FiEye,
  FiShoppingBag,
  FiSearch,
  FiBookOpen,
  FiUser,
  FiCheckCircle,
  FiExternalLink,
  FiArrowRight,
  FiCalendar
} from 'react-icons/fi';

export default function MyPurchases() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await API.get('/payments/my-orders');
      if (res.data?.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Fetch my orders error:', err);
      toast.error(err.message || 'Failed to fetch your purchases');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const title = order.noteTitle || order.note?.title || '';
    const subject = order.note?.subject || '';
    const seller = order.sellerName || order.seller?.name || '';
    const q = search.toLowerCase();
    return title.toLowerCase().includes(q) || subject.toLowerCase().includes(q) || seller.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
               style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <FiShoppingBag /> Study Library
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">
            My Purchased Materials
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Access, download, and review all study notes, question banks, and materials you have purchased.
          </p>
        </div>

        <Link
          to="/explorer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
          style={{ background: 'var(--accent)' }}
        >
          <FiSearch size={15} />
          <span>Explore Marketplace</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-4 top-3.5 text-gray-400" size={17} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, subject, or seller name..."
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl border text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-coral-400"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-coral-500/30 border-t-coral-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Loading your unlocked materials...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border backdrop-blur-xl"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4"
               style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <FiBookOpen />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            {search ? 'No materials match your search' : 'No purchased materials yet'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'Try a different keyword or subject name.'
              : 'Browse notes from verified student creators across top colleges and branches.'}
          </p>
          <Link
            to="/explorer"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg"
            style={{ background: 'var(--accent)' }}
          >
            <span>Browse Study Materials</span>
            <FiArrowRight />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const note = order.note || {};
            const seller = order.seller || {};
            const pdfUrl = note.pdfUrl;

            return (
              <div
                key={order._id}
                className="rounded-3xl border shadow-sm backdrop-blur-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative h-44 sm:h-52 w-full bg-gray-900/5 overflow-hidden border-b"
                       style={{ borderColor: 'var(--border)' }}>
                    <div className="absolute inset-0">
                      <PDFThumbnail pdfUrl={note.pdfUrl} title={order.noteTitle || note.title} note={note} />
                    </div>

                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                        <FiCheckCircle size={11} /> Unlocked
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 z-10">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/95 text-gray-900 shadow-sm border border-black/5">
                        Paid ₹{order.amount}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">
                      {order.noteTitle || note.title || 'Study Material'}
                    </h3>

                    <div className="text-xs text-gray-500 mb-3">
                      {note.subject || 'Academic'} {note.course ? `• ${note.course}` : ''} {note.branch ? `• ${note.branch}` : ''}
                    </div>

                    {/* Seller badge */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border text-xs"
                         style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                             style={{ background: 'var(--accent)' }}>
                          {(order.sellerName || seller.name || 'S').charAt(0)}
                        </div>
                        <span className="text-gray-700 truncate font-medium">
                          {order.sellerName || seller.name || 'Seller'}
                        </span>
                      </div>

                      {seller._id && (
                        <Link
                          to={`/seller/${seller._id}`}
                          className="text-[11px] font-bold text-coral-600 hover:underline shrink-0"
                        >
                          Profile
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-3">
                      <FiCalendar size={12} />
                      <span>
                        Purchased {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  {pdfUrl ? (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow-md transition"
                      style={{ background: 'var(--accent)' }}
                    >
                      <FiDownload size={14} />
                      <span>Download PDF</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400"
                    >
                      No PDF Attached
                    </button>
                  )}

                  {note._id && (
                    <Link
                      to={`/note/${note._id}/preview`}
                      className="px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-gray-700 hover:bg-black/5 transition"
                      style={{ borderColor: 'var(--border)' }}
                      title="View Details"
                    >
                      <FiEye size={15} />
                    </Link>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
