import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONDITIONS } from '../lib/constants'
import { compressImage } from '../lib/image'
import { normalize } from '../lib/normalize'
import Modal from './Modal'

const emptyForm = {
  name: '',
  category: '',
  quantity: 0,
  cost_price: 0,
  sale_price: 0,
  condition: '',
  entry_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function ProductForm({ product, categories = [], onClose, onSave }) {
  const isEditing = Boolean(product)
  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          cost_price: product.cost_price,
          sale_price: product.sale_price,
          condition: product.condition || '',
          entry_date: product.entry_date,
          notes: product.notes || '',
        }
      : emptyForm
  )
  const [photoFile, setPhotoFile] = useState(null)
  const [preview, setPreview] = useState(product?.photo_url || null)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Categoria já existente que só difere na grafia (maiúscula, acento): evita criar variações.
  const typedCategory = form.category.trim()
  const similarCategory = typedCategory
    ? categories.find((c) => c !== typedCategory && normalize(c) === normalize(typedCategory))
    : null

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      setPhotoFile(compressed)
      setPreview(URL.createObjectURL(compressed))
    } finally {
      setCompressing(false)
    }
  }

  async function uploadPhoto() {
    const ext = photoFile.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('product-photos').upload(path, photoFile)
    if (error) throw error
    const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      let photo_url = product?.photo_url || null
      if (photoFile) photo_url = await uploadPhoto()

      const payload = {
        ...form,
        quantity: Number(form.quantity),
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        condition: form.condition || null,
        notes: form.notes || null,
        photo_url,
      }

      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEditing ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Nome do produto/carta</label>
          <input
            required
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Categoria</label>
            <input
              list="category-options"
              autoComplete="off"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {similarCategory && (
              <p className="mt-1 text-xs text-gray-400">
                Já existe “{similarCategory}”.{' '}
                <button
                  type="button"
                  onClick={() => handleChange('category', similarCategory)}
                  className="text-gold-500 hover:text-gold-400"
                >
                  Usar essa
                </button>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Condição</label>
            <select
              value={form.condition}
              onChange={(e) => handleChange('condition', e.target.value)}
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
            >
              <option value="">N/A</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Quantidade</label>
            <input
              type="number"
              min="0"
              required
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Custo (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.cost_price}
              onChange={(e) => handleChange('cost_price', e.target.value)}
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Venda (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.sale_price}
              onChange={(e) => handleChange('sale_price', e.target.value)}
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Data de entrada</label>
          <input
            type="date"
            required
            value={form.entry_date}
            onChange={(e) => handleChange('entry_date', e.target.value)}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Foto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-600 file:px-3 file:py-1.5 file:text-gray-100"
          />
          {compressing && <p className="mt-1 text-xs text-gray-500">Otimizando imagem...</p>}
          {preview && (
            <img src={preview} alt="Prévia" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-gray-100 outline-none focus:border-gold-500"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-navy-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || compressing}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
