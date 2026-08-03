import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createListing, fetchListingDetail, updateListing } from '@/store/slices/listingSlice';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { PageLoader } from '@/components/auth/PageLoader';
import { applyFormError } from '@/utils/errors';
import { CATEGORY_LABELS, CONDITION_LABELS } from '@/utils/constants';
import {
  MAX_IMAGES,
  listingFormSchema,
  validateImageUrls,
  type ListingFormValues,
} from '@/validators/listing';
import type {
  CreateListingInput,
  ListingCategory,
  ListingCondition,
  SafeListing,
} from '@/types/listing';

const defaultValues: ListingFormValues = {
  title: '',
  description: '',
  price: 0,
  currency: 'USD',
  category: 'vehicles',
  condition: 'good',
  location: '',
};

function listingToForm(listing: SafeListing): ListingFormValues {
  return {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    category: listing.category,
    condition: listing.condition,
    location: listing.location ?? '',
  };
}

interface ListingFormPageProps {
  mode: 'create' | 'edit';
}

export function ListingFormPage({ mode }: ListingFormPageProps) {
  const isEdit = mode === 'edit';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { listing, status } = useAppSelector((state) => state.listings.detail);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues,
  });

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      dispatch(fetchListingDetail(id));
    }
  }, [dispatch, isEdit, id]);

  useEffect(() => {
    if (isEdit && status === 'succeeded' && listing) {
      reset(listingToForm(listing));
      setImageUrls(listing.images);
    }
  }, [isEdit, status, listing, reset]);

  if (isEdit && !listing && (status === 'idle' || status === 'loading')) {
    return <PageLoader />;
  }

  if (isEdit && !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Listing not found
        </h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Please log in to post a listing
        </h1>
      </div>
    );
  }

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    if (imageUrls.length >= MAX_IMAGES) {
      toast.error(`You can add up to ${MAX_IMAGES} images`);
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast.error('Image URLs must start with http(s)://');
      return;
    }
    setImageUrls((prev) => [...prev, url]);
    setImageInput('');
  };

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const onSubmit = async (values: ListingFormValues) => {
    const invalidUrls = validateImageUrls(imageUrls);
    if (invalidUrls.length > 0) {
      toast.error('One or more image URLs are invalid');
      return;
    }

    const payload: CreateListingInput = {
      ...values,
      ...(values.location ? { location: values.location } : {}),
      images: imageUrls,
    };

    try {
      if (isEdit && id) {
        const updated = await dispatch(updateListing({ id, input: payload })).unwrap();
        toast.success('Listing updated');
        navigate(`/listings/${updated._id}`);
      } else {
        const created = await dispatch(createListing(payload)).unwrap();
        toast.success('Listing published');
        navigate(`/listings/${created._id}`);
      }
    } catch (error) {
      applyFormError(
        error,
        setError,
        isEdit ? 'Unable to update the listing.' : 'Unable to publish the listing.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {isEdit ? 'Edit listing' : 'Post a new listing'}
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900"
        noValidate
      >
        <TextField
          label="Title"
          placeholder="e.g. 2019 Toyota Corolla"
          error={errors.title?.message}
          {...register('title')}
        />

        <TextAreaField
          label="Description"
          placeholder="Describe the item — condition, specs, reason for selling…"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Price"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            error={errors.price?.message}
            {...register('price')}
          />
          <TextField
            label="Currency"
            maxLength={3}
            placeholder="USD"
            error={errors.currency?.message}
            {...register('currency')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Category" error={errors.category?.message} {...register('category')}>
            {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Condition"
            error={errors.condition?.message}
            {...register('condition')}
          >
            {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((value) => (
              <option key={value} value={value}>
                {CONDITION_LABELS[value]}
              </option>
            ))}
          </SelectField>
        </div>

        <TextField
          label="Location"
          placeholder="City or neighborhood"
          error={errors.location?.message}
          {...register('location')}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Images <span className="text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageInput}
              onChange={(event) => setImageInput(event.target.value)}
              placeholder="Paste an image URL"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
            />
            <button
              type="button"
              onClick={addImage}
              disabled={imageUrls.length >= MAX_IMAGES}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Add
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Up to {MAX_IMAGES} images. Cloudinary upload arrives in a later milestone.
          </p>
          {imageUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imageUrls.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <span className="max-w-56 truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="font-semibold text-red-500 hover:text-red-600"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? isEdit
                ? 'Saving…'
                : 'Publishing…'
              : isEdit
                ? 'Save changes'
                : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
