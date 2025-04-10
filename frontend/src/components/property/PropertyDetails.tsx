import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Home,
  CheckCircle,
  X,
  Phone,
  Mail,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { fetchApartmentDetails } from "../../services/apartmentService";
import { useSearch } from "../../contexts/SearchContext";

// Define a detailed apartment interface based on the example_apartments_detail.json structure
interface ApartmentFeatureValue {
  key: string;
  value: string;
}

interface ApartmentFeaturePolicy {
  header: string;
  values: ApartmentFeatureValue[];
}

interface ApartmentFeeSection {
  title: string;
  policies?: ApartmentFeaturePolicy[];
  fees?: ApartmentFeatureValue[];
}

interface ApartmentAmenitySection {
  title: string;
  value: string[];
}

interface ApartmentSchool {
  type: string;
  name: string;
  grades?: string;
  numberOfStudents?: string;
  drive?: string;
  distance?: string;
}

interface ApartmentSchools {
  public?: ApartmentSchool[];
  private?: ApartmentSchool[];
  colleges?: ApartmentSchool[];
}

interface ApartmentLocation {
  fullAddress: string;
  city: string;
  state: string;
  postalCode: string;
  streetAddress: string;
}

interface ApartmentModelUnit {
  availability: string;
  price: string;
  sqft: string;
  type: string;
}

interface ApartmentModel {
  modelName: string;
  rentLabel: string;
  details: string[];
  leaseOptions: string;
  availability: string;
  availabilityInfo: string;
  units: ApartmentModelUnit[];
}

interface ApartmentPoiItem {
  name: string;
  distance: string;
  walk?: string;
  drive?: string;
  url?: string;
}

interface ApartmentContact {
  phone: string;
  logo: string;
  name: string;
}

interface ApartmentDetail {
  id: string;
  propertyName: string;
  url: string;
  breadcrumbs: string[];
  lastUpdated: string;
  location: ApartmentLocation;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number | null;
  isVerified: boolean;
  rent: {
    min: number;
    max: number | null;
  };
  beds: string;
  baths: string;
  sqft: string;
  photos: string[];
  description: string;
  amenities: ApartmentAmenitySection[];
  fees: ApartmentFeeSection[];
  requiredFees: ApartmentFeeSection[];
  petFees: ApartmentFeeSection[];
  parkingFees: ApartmentFeeSection[];
  schools: ApartmentSchools;
  poi: ApartmentPoiItem[];
  transportation: ApartmentPoiItem[];
  transitAndPOI: ApartmentPoiItem[];
  contact: ApartmentContact;
  models: ApartmentModel[];
  specials: {
    label: string;
    title: string;
    description: string;
  };
  scores?: {
    walkScore?: number;
    transitScore?: number;
  };
  neighborhoodDescription?: string;
}

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { searchPerformed } = useSearch();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("No apartment ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching details for apartment ID: ${id}`);
        const data = await fetchApartmentDetails(id);
        setApartment(data);

        console.log("Apartment details loaded:", data);
      } catch (err) {
        console.error("Error fetching apartment details:", err);
        setError(err instanceof Error ? err.message : "Failed to load apartment details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle back navigation
  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Get the current search parameters from URL to preserve state
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get("returnTo");
    
    if (returnTo) {
      // If returnTo is specified, navigate to that URL with the preserved query
      navigate(decodeURIComponent(returnTo));
    } else if (searchPerformed) {
      // If a search was performed but no returnTo, just go to search
      navigate("/search");
    } else {
      // Otherwise, navigate back in history
      navigate(-1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-semibold font-sans mb-2">Loading property details...</h2>
          <p className="text-vibe-charcoal/70">Please wait while we fetch the information.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !apartment) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 rounded-full p-8 inline-block mb-6">
          <X className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold font-sans mb-4">Property Not Found</h2>
        <p className="text-vibe-charcoal/70 mb-8">
          {error || "The property you're looking for doesn't exist or has been removed."}
        </p>
        <a
          href="/search"
          className="inline-flex items-center gap-2 px-4 py-2 bg-vibe-navy text-white rounded-lg"
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </a>
      </div>
    );
  }

  // Extract features from amenities
  const flattenedAmenities = apartment.amenities.flatMap((section) => section.value);

  // Format price to locale string
  const formatPrice = (price: number): string => {
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen pb-16 bg-white">      
      {/* Top Navigation - removed sticky positioning */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/search" className="flex items-center text-vibe-charcoal/70" onClick={handleBackClick}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back</span>
          </a>

          <div className="flex items-center gap-4">
            {/* Favorites and share buttons removed */}
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden shadow-sm aspect-[4/3]">
              <img
                src={apartment.photos[selectedImageIndex]}
                alt={apartment.propertyName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl shadow-sm aspect-[4/3]">
              <div className="overflow-x-scroll overflow-y-visible h-full p-2 big-scrollbar">
                <div
                  className="grid grid-flow-col grid-rows-2 gap-x-4 gap-y-4 h-full"
                  style={{ gridAutoColumns: "calc(50% - 0.5rem)" }}
                >
                  {apartment.photos.map((image, index) => (
                    <div
                      key={index}
                      className={`rounded overflow-hidden cursor-pointer transition-all ${
                        selectedImageIndex === index
                          ? "ring-4 ring-[#0F4C81] ring-offset-4"
                          : "hover:opacity-90"
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={image}
                        alt={`${apartment.propertyName} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Property Details */}
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-semibold text-vibe-navy font-sans">{apartment.propertyName}</h1>
                <p className="text-2xl font-semibold text-vibe-charcoal/70">
                  {formatPrice(apartment.rent.min)}
                  {apartment.rent.max ? ` - ${formatPrice(apartment.rent.max)}` : ""}/mo
                </p>
              </div>

              <div className="flex items-center text-vibe-charcoal/70 mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{apartment.location.fullAddress}</span>
              </div>

              <div className="flex items-center gap-6 py-4 border-y border-gray-200">
                <div className="flex items-center">
                  <Bed className="h-5 w-5 mr-2 text-vibe-charcoal/70" />
                  <div>
                    <p className="font-medium">{apartment.beds}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Bath className="h-5 w-5 mr-2 text-vibe-charcoal/70" />
                  <div>
                    <p className="font-medium">{apartment.baths}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Square className="h-5 w-5 mr-2 text-vibe-charcoal/70" />
                  <div>
                    <p className="font-medium">{apartment.sqft}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Offers */}
            {apartment.specials && apartment.specials.description && (
              <div className="mb-8 p-4 border border-vibe-navy/20 bg-vibe-navy/10 rounded-lg">
                <h2 className="text-xl font-semibold mb-2 text-vibe-navy font-sans">
                  {apartment.specials.label || "Special Offer"}
                </h2>
                <p className="whitespace-pre-line font-sans">{apartment.specials.description}</p>
              </div>
            )}

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 font-sans">Description</h2>
              <p className="text-vibe-charcoal whitespace-pre-line font-sans max-h-[400px] overflow-y-auto pr-2 big-scrollbar">
                {apartment.description.replace(/About.*?\n/i, "")}
              </p>
            </div>

            {/* Floor Plans */}
            {apartment.models && apartment.models.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 font-sans">Floor Plans</h2>
                <div className="space-y-4">
                  {apartment.models.map((model, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <div className="bg-vibe-navy/10 p-4 border-b">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold font-sans">{model.modelName}</h3>
                          <p className="font-semibold text-vibe-navy">{model.rentLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-vibe-charcoal/70">
                          {model.details.map((detail, detailIdx) => (
                            <span key={detailIdx}>{detail}</span>
                          ))}
                        </div>
                      </div>

                      {model.units && model.units.length > 0 && (
                        <div className="p-4">
                          <h4 className="text-sm font-medium mb-2 font-sans">Available Units</h4>
                          <div className="space-y-2">
                            {model.units.map((unit, unitIdx) => (
                              <div
                                key={unitIdx}
                                className="flex justify-between items-center text-sm p-2 bg-white rounded border"
                              >
                                <span>{unit.type}</span>
                                <span>{unit.sqft}</span>
                                <span>{unit.price}</span>
                                <span className="text-green-600">
                                  Available {unit.availability}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features & Amenities */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 font-sans">Features & Amenities</h2>

              {apartment.amenities.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-4">
                  <h3 className="font-medium mb-2 font-sans">{section.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {section.value.map((feature, featureIdx) => (
                      <div key={featureIdx} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-vibe-navy mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Location & Transportation */}
            {apartment.coordinates && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 font-sans">Location</h2>
                <div className="mb-4 aspect-video bg-vibe-navy/5 rounded-xl overflow-hidden relative">
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${apartment.coordinates.latitude},${apartment.coordinates.longitude}&zoom=15`}
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Transportation */}
                {apartment.transportation && apartment.transportation.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2 font-sans">Transportation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {apartment.transportation.slice(0, 6).map((item, idx) => (
                        <div key={idx} className="flex items-start">
                          <div className="bg-vibe-navy/10 p-2 rounded mr-3 border-vibe-navy/20">
                            <MapPin className="h-5 w-5 text-vibe-navy" />
                          </div>
                          <div>
                            <p className="font-medium font-sans">{item.name}</p>
                            <p className="text-sm text-vibe-charcoal/70">
                              {item.walk
                                ? `${item.walk} walk`
                                : item.drive
                                ? `${item.drive} drive`
                                : ""}{" "}
                              · {item.distance}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schools */}
            {apartment.schools && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 font-sans">Schools</h2>

                {apartment.schools.public && apartment.schools.public.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2 font-sans">Public Schools</h3>
                    <div className="space-y-3">
                      {apartment.schools.public.map((school, idx) => (
                        <div key={idx} className="border rounded p-3">
                          <p className="font-medium font-sans">{school.name}</p>
                          <div className="flex justify-between text-sm text-vibe-charcoal/70">
                            <span>{school.type}</span>
                            <span>
                              Grades {school.grades} · {school.numberOfStudents} students
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {apartment.schools.private && apartment.schools.private.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2 font-sans">Private Schools</h3>
                    <div className="space-y-3">
                      {apartment.schools.private.map((school, idx) => (
                        <div key={idx} className="border rounded p-3">
                          <p className="font-medium font-sans">{school.name}</p>
                          <div className="flex justify-between text-sm text-vibe-charcoal/70">
                            <span>{school.type}</span>
                            <span>
                              Grades {school.grades}{" "}
                              {school.numberOfStudents
                                ? `· ${school.numberOfStudents} students`
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {apartment.schools.colleges && apartment.schools.colleges.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 font-sans">Colleges & Universities</h3>
                    <div className="space-y-3">
                      {apartment.schools.colleges.map((school, idx) => (
                        <div key={idx} className="border rounded p-3">
                          <p className="font-medium font-sans">{school.name}</p>
                          <div className="text-sm text-vibe-charcoal/70">
                            <span>{school.distance} away</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fees & Policies */}
            {apartment.fees && apartment.fees.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 font-sans">Fees & Policies</h2>

                {apartment.requiredFees && apartment.requiredFees.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2 font-sans">Required Fees</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {apartment.requiredFees.flatMap(
                            (section) =>
                              section.fees?.map((fee, idx) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                  <td className="p-3 font-medium font-sans">{fee.key}</td>
                                  <td className="p-3 text-right">{fee.value}</td>
                                </tr>
                              )) || []
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {apartment.petFees && apartment.petFees.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2 font-sans">Pet Policy</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {apartment.petFees.flatMap(
                            (section) =>
                              section.fees?.map((fee, idx) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                  <td className="p-3 font-medium font-sans">{fee.key}</td>
                                  <td className="p-3 text-right">{fee.value}</td>
                                </tr>
                              )) || []
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {apartment.fees && apartment.fees.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 font-sans">Additional Details</h3>
                    <div className="border rounded-lg overflow-hidden">
                      {apartment.fees.map((section, sectionIdx) => (
                        <div key={sectionIdx} className="border-b last:border-b-0">
                          {section.title && (
                            <div className="bg-white p-3 border-b font-medium font-sans">
                              {section.title}
                            </div>
                          )}
                          {section.policies &&
                            section.policies.map((policy, policyIdx) => (
                              <div key={policyIdx} className="p-3 border-b last:border-b-0">
                                <h4 className="font-medium mb-2 font-sans">{policy.header}</h4>
                                <div className="space-y-1">
                                  {policy.values.map((value, valueIdx) => (
                                    <div key={valueIdx} className="flex justify-between">
                                      <span className="font-sans">{value.key}</span>
                                      <span className="font-sans">{value.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Neighborhood */}
            {apartment.neighborhoodDescription && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 font-sans">Neighborhood</h2>
                <p className="text-vibe-charcoal whitespace-pre-line font-sans">
                  {apartment.neighborhoodDescription}
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white p-6 rounded-xl shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold mb-4 font-sans">Contact Property</h3>

              {showContactForm ? (
                <div className="space-y-4">
                  <button
                    className="absolute top-4 right-4 text-vibe-charcoal/50 hover:text-vibe-charcoal"
                    onClick={() => setShowContactForm(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-vibe-charcoal mb-1 font-sans">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-vibe-navy focus:border-transparent font-sans"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-vibe-charcoal mb-1 font-sans">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-vibe-navy focus:border-transparent font-sans"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-vibe-charcoal mb-1 font-sans">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-vibe-navy focus:border-transparent font-sans"
                      placeholder="(123) 456-7890"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-vibe-charcoal mb-1 font-sans"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-vibe-navy focus:border-transparent font-sans"
                      placeholder="I'm interested in this property and would like to schedule a viewing."
                    ></textarea>
                  </div>

                  <button className="w-full bg-vibe-navy text-white rounded-md py-2 px-4 font-medium hover:bg-vibe-navy/90 transition-colors font-sans">
                    Send Message
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {apartment.contact && apartment.contact.logo && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={apartment.contact.logo}
                        alt="Property management logo"
                        className="h-12 object-contain"
                      />
                    </div>
                  )}

                  {apartment.contact && apartment.contact.phone && (
                    <a
                      href={`tel:${apartment.contact.phone}`}
                      className="flex items-center justify-center gap-2 w-full bg-[#0F4C81] text-white rounded-md py-2 px-4 font-medium hover:bg-vibe-navy/90 transition-colors font-sans"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{apartment.contact.phone}</span>
                    </a>
                  )}

                  <button
                    onClick={() => setShowContactForm(true)}
                    className="flex items-center justify-center gap-2 w-full border border-vibe-navy text-vibe-navy rounded-md py-2 px-4 font-medium hover:bg-vibe-navy/5 transition-colors font-sans"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Property</span>
                  </button>

                  {apartment.url && (
                    <a
                      href={apartment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-white text-vibe-charcoal border border-vibe-navy/20 rounded-md py-2 px-4 font-medium hover:bg-vibe-navy/5 transition-colors font-sans"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View on Apartments.com</span>
                    </a>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium mb-2 font-sans">Apartment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-vibe-charcoal/70 font-sans">Property Name</span>
                        <span className="font-medium font-sans">{apartment.propertyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-vibe-charcoal/70 font-sans">Last Updated</span>
                        <span className="font-medium font-sans">{apartment.lastUpdated}</span>
                      </div>
                      {apartment.scores && (
                        <>
                          {apartment.scores.walkScore && (
                            <div className="flex justify-between">
                              <span className="text-vibe-charcoal/70 font-sans">Walk Score</span>
                              <span className="font-medium font-sans">{apartment.scores.walkScore}/100</span>
                            </div>
                          )}
                          {apartment.scores.transitScore && (
                            <div className="flex justify-between">
                              <span className="text-vibe-charcoal/70 font-sans">Transit Score</span>
                              <span className="font-medium font-sans">
                                {apartment.scores.transitScore}/100
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
