import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Mail,
  Calendar,
  GraduationCap,
  Phone,
  MapPin,
  School,
  IdCard,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import type { Profile, BacOption } from '@/types/database';
import { BAC_OPTIONS } from '@/types/database';

/**
 * Student profile page - allows students to view and update their profile information.
 * - Fetches profile data from Supabase
 * - Displays read-only fields (name, email, birth date, CNE, Bac option, Bac year)
 * - Allows editing of: phone, parent_phone, city, lycee
 */
export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    phone: '',
    parent_phone: '',
    city: '',
    lycee: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  /**
   * Fetches the current user's profile from Supabase.
   */
  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profileData = data as any as Profile;
        setProfile(profileData);
        // Initialize edit form with current values
        setEditForm({
          phone: profileData.phone || '',
          parent_phone: profileData.parent_phone || '',
          city: profileData.city || '',
          lycee: profileData.lycee || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger votre profil.',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles saving the edited profile information.
   * Only updates the editable fields: phone, parent_phone, city, lycee.
   */
  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: editForm.phone || null,
          parent_phone: editForm.parent_phone || null,
          city: editForm.city || null,
          lycee: editForm.lycee || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vos informations ont été mises à jour.',
      });

      setIsEditing(false);
      // Refresh profile data
      await fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour votre profil: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handles canceling the edit mode and resetting form values.
   */
  const handleCancel = () => {
    if (profile) {
      setEditForm({
        phone: profile.phone || '',
        parent_phone: profile.parent_phone || '',
        city: profile.city || '',
        lycee: profile.lycee || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profil introuvable.</p>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Get Bac option label
  const getBacOptionLabel = (bacOption: BacOption | null) => {
    if (!bacOption) return '—';
    const option = BAC_OPTIONS.find((opt) => opt.value === bacOption);
    return option ? option.label : bacOption;
  };

  // Get user email from auth.users (if available)
  const userEmail = user?.email || profile.email || '—';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes informations</h1>
          <p className="text-muted-foreground">
            Consultez et modifiez vos données personnelles
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        )}
      </div>

      {/* Informations personnelles (Read-only) */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold">Informations personnelles</h3>
            <p className="text-sm text-muted-foreground">
              Ces informations ne peuvent être modifiées que par l'administration.
            </p>
          </div>

          <InfoRow
            icon={User}
            label="Nom complet"
            value={`${profile.first_name} ${profile.last_name}`}
          />
          <Divider />
          <InfoRow icon={Mail} label="Email" value={userEmail} />
          <Divider />
          <InfoRow
            icon={IdCard}
            label="CNE / Massar"
            value={profile.massar_code || '—'}
          />
          <Divider />
          <InfoRow
            icon={GraduationCap}
            label="Option Bac"
            value={getBacOptionLabel(profile.bac_option)}
          />
          {profile.bac_year && (
            <>
              <Divider />
              <InfoRow
                icon={GraduationCap}
                label="Année du Bac"
                value={profile.bac_year.toString()}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Coordonnées & Scolarité (Editable) */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold">Coordonnées & Scolarité</h3>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? 'Vous pouvez modifier ces informations.'
                : 'Vous pouvez modifier ces informations.'}
            </p>
          </div>

          {isEditing ? (
            <>
              {/* Editable form fields */}
              <EditableInfoRow
                icon={Phone}
                label="Téléphone"
                value={editForm.phone}
                onChange={(value) => setEditForm({ ...editForm, phone: value })}
                type="tel"
                placeholder="Ex: 06XXXXXXXX"
              />
              <Divider />
              <EditableInfoRow
                icon={Phone}
                label="Téléphone parent"
                value={editForm.parent_phone}
                onChange={(value) =>
                  setEditForm({ ...editForm, parent_phone: value })
                }
                type="tel"
                placeholder="Ex: 06XXXXXXXX"
              />
              <Divider />
              <EditableInfoRow
                icon={MapPin}
                label="Ville"
                value={editForm.city}
                onChange={(value) => setEditForm({ ...editForm, city: value })}
                type="text"
                placeholder="Ex: Agadir"
              />
              <Divider />
              <EditableInfoRow
                icon={School}
                label="Établissement (Lycée)"
                value={editForm.lycee}
                onChange={(value) => setEditForm({ ...editForm, lycee: value })}
                type="text"
                placeholder="Ex: Lycée Abla ben Yassine"
              />
            </>
          ) : (
            <>
              {/* Read-only display */}
              <InfoRow icon={Phone} label="Téléphone" value={profile.phone || '—'} />
              <Divider />
              <InfoRow
                icon={Phone}
                label="Téléphone parent"
                value={profile.parent_phone || '—'}
              />
              <Divider />
              <InfoRow icon={MapPin} label="Ville" value={profile.city || '—'} />
              <Divider />
              <InfoRow
                icon={School}
                label="Établissement (Lycée)"
                value={profile.lycee || '—'}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Components ---------- */

/**
 * Displays a read-only information row with an icon, label, and value.
 */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

/**
 * Displays an editable information row with an input field.
 */
function EditableInfoRow({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  icon: any;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-2">
        <Label htmlFor={label} className="text-sm text-muted-foreground">
          {label}
        </Label>
        <Input
          id={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
      </div>
    </div>
  );
}

/**
 * Visual divider between information rows.
 */
function Divider() {
  return <div className="h-px w-full bg-border" />;
}
