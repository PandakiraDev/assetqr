'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface PhotoUploadProps {
  itemId?: string
  currentPhotoUrl?: string | null
  currentStoragePath?: string | null
  onPhotoChange: (photoUrl: string | null, storagePath: string | null) => void
  disabled?: boolean
}

export function PhotoUpload({
  itemId,
  currentPhotoUrl,
  currentStoragePath,
  onPhotoChange,
  disabled = false,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Sync previewUrl with currentPhotoUrl prop
  useEffect(() => {
    setPreviewUrl(currentPhotoUrl || null)
  }, [currentPhotoUrl])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      return file
    }
  }

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Nieprawidłowy format',
        description: 'Dozwolone są tylko pliki graficzne (JPG, PNG, GIF, WebP)',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    try {
      // Compress image
      const compressedFile = await compressImage(file)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${itemId || 'temp'}-${Date.now()}.${fileExt}`
      const storagePath = `item-photos/${fileName}`

      // Delete old photo if exists
      if (currentStoragePath) {
        await supabase.storage
          .from('item-photos')
          .remove([currentStoragePath.replace('item-photos/', '')])
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-photos')
        .getPublicUrl(fileName)

      setPreviewUrl(publicUrl)
      onPhotoChange(publicUrl, storagePath)

      toast({
        title: 'Sukces',
        description: 'Zdjęcie zostało przesłane',
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się przesłać zdjęcia',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      uploadFile(file)
    }
  }, [disabled, currentStoragePath])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (currentStoragePath) {
      try {
        await supabase.storage
          .from('item-photos')
          .remove([currentStoragePath.replace('item-photos/', '')])
      } catch (error) {
        console.error('Error removing photo:', error)
      }
    }

    setPreviewUrl(null)
    onPhotoChange(null, null)
  }

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative group">
          <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted">
            <img
              src={previewUrl}
              alt="Zdjęcie przedmiotu"
              className="w-full h-full object-contain"
            />
          </div>
          {!disabled && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemovePhoto}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`
            aspect-video rounded-lg border-2 border-dashed
            flex flex-col items-center justify-center gap-2 cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Przesyłanie...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Przeciągnij zdjęcie tutaj lub kliknij, aby wybrać
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF, WebP (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  )
}
