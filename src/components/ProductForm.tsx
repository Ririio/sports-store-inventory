import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DangerButton, PrimaryButton } from '@/components/Buttons';
import { Chip } from '@/components/Chip';
import { ChoiceSection } from '@/components/ChoiceSection';
import { AUDIENCES, CATEGORY_GROUPS, COLORS, KNOWN_CATEGORIES, SIZES, SPORTS, departmentForCategory } from '@/lib/categories';
import { productName } from '@/lib/format';
import type { ItemDetails } from '@/lib/types';
import { normalizeUpc } from '@/lib/upc';
import { colors } from '@/theme';

type Props = {
  imageUri: string;
  upc: string | null;
  initial: ItemDetails;
  submitLabel: string;
  busy?: boolean;
  upcEditable?: boolean;
  onReplacePhoto?: () => void;
  onRescan?: () => void;
  onDelete?: () => void;
  onSubmit: (details: ItemDetails) => void;
};

export function ProductForm({
  imageUri,
  upc,
  initial,
  submitLabel,
  busy,
  upcEditable,
  onReplacePhoto,
  onRescan,
  onDelete,
  onSubmit,
}: Props) {
  const initialDepartment = initial.department || departmentForCategory(initial.category);
  const [department, setDepartment] = useState(initialDepartment);
  const [audience, setAudience] = useState(initial.audience || '');
  const [category, setCategory] = useState(initial.category || '');
  const [customCategory, setCustomCategory] = useState(
    initial.category &&
      !KNOWN_CATEGORIES.has(initial.category) &&
      !CATEGORY_GROUPS.some((group) => group.title === initial.category)
      ? initial.category
      : '',
  );
  const [showTypes, setShowTypes] = useState(
    Boolean(initial.category && initial.category !== initialDepartment),
  );
  const [sport, setSport] = useState(initial.sport);
  const [size, setSize] = useState(initial.size);
  const [color, setColor] = useState(initial.color);
  const [brand, setBrand] = useState(initial.brand);
  const [quantity, setQuantity] = useState(initial.quantity > 0 ? initial.quantity : 1);
  const [notes, setNotes] = useState(initial.notes);
  const [upcText, setUpcText] = useState(initial.upc ?? '');

  function submit() {
    if (!department) {
      Alert.alert('Choose a department', 'Pick a broad category such as headwear, tops, or accessories.');
      return;
    }
    const chosenCategory = (customCategory.trim() || category || department).trim();
    const nextUpc = upcEditable ? normalizeUpc(upcText) : upc;
    onSubmit({
      upc: nextUpc && nextUpc.length > 0 ? nextUpc : null,
      category: chosenCategory,
      department,
      audience: audience.trim(),
      sport: sport.trim(),
      size: size.trim(),
      color: color.trim(),
      brand: brand.trim(),
      quantity,
      notes: notes.trim(),
    });
  }

  const customSelected = customCategory.trim().length > 0;
  const chosenGroup = CATEGORY_GROUPS.find((group) => group.title === department);
  const name = productName({
    brand,
    sport,
    color,
    category: (customCategory.trim() || category || department).trim(),
  });

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.scroller}
    >
      <Image source={{ uri: imageUri }} style={styles.photo} />
      {onReplacePhoto ? (
        <Text onPress={onReplacePhoto} style={styles.link}>
          Replace photo
        </Text>
      ) : null}

      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>{upc || upcText ? 'UPC' : 'No barcode'}</Text>
        {upcEditable ? (
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUpcText}
            placeholder="Leave blank if there is no barcode"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={upcText}
          />
        ) : (
          <Text style={styles.bannerValue}>{upc ?? 'Saved without a UPC'}</Text>
        )}
        {onRescan ? (
          <Text onPress={onRescan} style={styles.link}>
            Wrong barcode? Scan again
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Department (required)</Text>
        <Text style={styles.hint}>One tap is enough. A specific type is optional.</Text>
        <View style={styles.chips}>
          {CATEGORY_GROUPS.map((group) => (
            <Chip
              key={group.title}
              label={group.title === 'Headwear' ? 'Hats / Headwear' : group.title === 'Gear' ? 'Sports gear' : group.title}
              selected={department === group.title}
              onPress={() => {
                if (department === group.title) return;
                setDepartment(group.title);
                setCategory(group.title);
                setCustomCategory('');
                setShowTypes(false);
              }}
            />
          ))}
        </View>
        {department ? (
          <Text onPress={() => setShowTypes((visible) => !visible)} style={styles.link}>
            {showTypes ? 'Hide specific type' : 'Add specific type (optional)'}
          </Text>
        ) : null}
        {department && showTypes ? (
          <View style={styles.group}>
            <View style={styles.chips}>
              {chosenGroup?.items.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={!customSelected && category === item}
                  onPress={() => {
                    setCustomCategory('');
                    setCategory(item);
                  }}
                />
              ))}
            </View>
            <TextInput
              autoCapitalize="words"
              onChangeText={setCustomCategory}
              placeholder="Or enter a specific type"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={customCategory}
            />
          </View>
        ) : null}
      </View>

      <ChoiceSection
        hint="Men, women, youth, or unisex. Optional if unknown."
        label="Audience"
        onChange={setAudience}
        options={[...AUDIENCES]}
        value={audience}
      />
      <ChoiceSection
        customPlaceholder="Other sport"
        hint="Optional."
        label="Sport"
        onChange={setSport}
        options={SPORTS}
        value={sport}
      />
      <ChoiceSection
        customPlaceholder="Other size, such as 32 or 7 1/2"
        hint="Optional."
        label="Size"
        onChange={setSize}
        options={SIZES}
        value={size}
      />
      <ChoiceSection
        customPlaceholder="Other color"
        hint="Optional."
        label="Color"
        onChange={setColor}
        options={COLORS}
        value={color}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Brand</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setBrand}
          placeholder="Optional"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={brand}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Quantity</Text>
        <View style={styles.stepper}>
          <Text onPress={() => setQuantity((current) => Math.max(1, current - 1))} style={styles.step}>
            −
          </Text>
          <Text style={styles.quantity}>{quantity}</Text>
          <Text onPress={() => setQuantity((current) => Math.min(999, current + 1))} style={styles.step}>
            +
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Condition, team, bin, or anything else"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.notes]}
          textAlignVertical="top"
          value={notes}
        />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Automatic product name</Text>
        <Text style={name ? styles.bannerValue : styles.hint}>{name || 'Choose a department above'}</Text>
      </View>
      <PrimaryButton disabled={busy} label={busy ? 'Saving...' : submitLabel} onPress={submit} />
      {onDelete ? <DangerButton label="Delete item" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    gap: 22,
    padding: 16,
    paddingBottom: 40,
  },
  photo: {
    backgroundColor: colors.chip,
    borderRadius: 16,
    height: 160,
    width: '100%',
  },
  banner: {
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: 6,
    padding: 14,
  },
  bannerLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bannerValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  link: {
    color: colors.orange,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notes: {
    minHeight: 96,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  step: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    overflow: 'hidden',
    textAlign: 'center',
    width: 52,
    lineHeight: 52,
  },
  quantity: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'center',
  },
});
