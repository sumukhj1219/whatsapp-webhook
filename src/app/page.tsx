"use client"

import React from "react"

import type { ReactElement } from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Switch } from "~/components/ui/switch"
import {
  Search,
  MapPin,
  Phone,
  Building,
  IndianRupee,
  ArrowUpDown,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Moon,
  Sun,
  Menu,
  X,
  Home,
  TrendingUp,
} from "lucide-react"
import { useTheme } from "next-themes"

// Sample WhatsApp data with more variety
const sampleWhatsAppData = `[9:24 pm, 8/7/2025] Jinesh Hacker House: OFFICE FOR RENT Opp St.John School, CHARAI THANE (w) - 400601 Carpet Area: 1600 Sq.ft Rent: 1,76,000 Previous Tenant: Metropolis Healthcare Lab Condition: Warmshell Possession: August DATTA 8655793033

[9:24 pm, 8/7/2025] Jinesh Hacker House: CHARAI NEAR GANESH CINEMA THANE 400601 (All PAKEJ DIL) 1 BHK 460 C ₹ 85 lac 1 BHK 522 C ₹ 95 lac 2 BHK 700 C ₹ 1.30 cr Pakej with Parking OFFICE 1st Floor 522 C ₹ 1.05 cr Parking extra charge DATTA 8655793033

[9:25 pm, 8/7/2025] Jinesh Hacker House: Available Converted 2.5 Bhk Flat on Rent At pachpakhadi Thane 400602 Area flat is at 5th floor out of 8 Area in Carpet is 767 Sq Ft Rera Carpet Along with kitchen Trolley pipe Gas And one Car Parking asking Rent 53000 Nego please Call Me on my Cell no 9920244733 9619398561 Shailesh Mainkar

[9:26 pm, 8/7/2025] Jinesh Hacker House: 🔴 3 bhk ~ Park Woods. Project - PARK WOODS. Behind D'mart. Gb Rd. Thane west 400604. Available LARGE, LAVISH & LUXURIOUS Fully Furnished 3 bhk in Higher Floor with Beautiful Interior, Wonderful Condition, Awesome View & 2 🚘 🚘 Parkings. Rent - 85 k Deposit - 6 Months.

[9:27 pm, 8/7/2025] Jinesh Hacker House: 🔴 3.5 bhk ~ Garden Enclave. Project - GARDEN ENCLAVE. Vasant Vihar. Thane west 400607. Available 3.5 bhk FULLY FURNISHED without TV, Wonderful Condition, Amazing View & Parking. Rent - 1 Lakh. Deposit - 6 Months. Note - Family, Bachelors & Single Girls from any Caste or Religions are most welcome🙏

[9:28 pm, 8/7/2025] Jinesh Hacker House: 🔴 3 bhk ~ Makhmali Talao. Location - MAKHMALI TALAO. Thane west 400603. Available Spacious & Semi Furnished 3 bhk with 4 Large Balconies, 4 Washrooms, Beautiful Condition & Parking. Rent - 75000 Contact: 9876543210

[9:29 pm, 8/7/2025] Jinesh Hacker House: COMMERCIAL SPACE AVAILABLE Hiranandani Estate Thane 400607 Ground Floor Shop 800 sq ft ₹ 2.5 Lakh/month Prime Location High Footfall Suitable for Retail/Office Contact: 9988776655

[9:30 pm, 8/7/2025] Jinesh Hacker House: 2 BHK SALE Ghodbunder Road Thane 400615 Carpet: 950 sq ft Price: ₹ 1.45 Cr Ready Possession Amenities: Gym, Pool, Garden Contact: 8877665544`

interface PropertyData {
  id: string
  timestamp: string
  sender: string
  propertyType: "Residential" | "Commercial" | "Office"
  transactionType: "Rent" | "Sale"
  bhkType: string
  address: string
  pinCode: string
  carpetArea: string
  price: string
  priceNumeric: number
  condition: string
  floor: string
  parking: boolean
  contact: string[]
  amenities: string[]
  possession: string
  deposit: string
  rawMessage: string
}

type SortField = keyof PropertyData
type SortDirection = "asc" | "desc"

// Enhanced parsing function (same as before)
function parseWhatsAppData(data: string): PropertyData[] {
  const messagePattern = /\[(.*?)\]\s*(.*?):\s*(.*?)(?=\[|$)/gs
  const messages: PropertyData[] = []
  let match

  while ((match = messagePattern.exec(data)) !== null) {
    const [, timestamp, sender, content] = match
    const text = content.trim()

    if (!text) continue

    // Extract property type
    let propertyType: "Residential" | "Commercial" | "Office" = "Residential"
    if (/office|commercial|shop|retail/i.test(text)) {
      propertyType = /office/i.test(text) ? "Office" : "Commercial"
    }

    // Extract transaction type
    const transactionType: "Rent" | "Sale" = /rent|rental/i.test(text) ? "Rent" : "Sale"

    // Extract BHK type
    const bhkMatch = text.match(/(\d+(?:\.\d+)?)\s*bhk/i)
    const bhkType = bhkMatch ? `${bhkMatch[1]} BHK` : propertyType === "Office" ? "Office Space" : "Commercial Space"

    // Extract address and pin code
    const { address, pinCode } = extractAddressAndPin(text)

    // Extract carpet area
    const areaMatch =
      text.match(/(?:carpet|area).*?(\d+)\s*(?:sq\.?\s*ft|sqft)/i) ||
      text.match(/(\d+)\s*(?:sq\.?\s*ft|sqft)/i) ||
      text.match(/(\d+)\s*c(?:\s|$)/i)
    const carpetArea = areaMatch ? `${areaMatch[1]} sq ft` : ""

    // Extract price with better parsing
    const { price, priceNumeric } = extractPrice(text)

    // Extract condition
    const conditionMatch = text.match(/(furnished|semi furnished|unfurnished|warmshell|ready)/i)
    const condition = conditionMatch ? conditionMatch[1] : ""

    // Extract floor
    const floorMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i)
    const floor = floorMatch ? `${floorMatch[1]} Floor` : ""

    // Check parking
    const parking = /parking/i.test(text)

    // Extract contacts
    const contactMatches = text.match(/\d{10}/g) || []
    const contact = [...new Set(contactMatches)]

    // Extract amenities
    const amenities = extractAmenities(text)

    // Extract possession
    const possessionMatch = text.match(/possession[:\s]*([^.\n]+)/i)
    const possession = possessionMatch ? possessionMatch[1].trim() : ""

    // Extract deposit
    const depositMatch = text.match(/deposit[:\s-]*([^.\n]+)/i)
    const deposit = depositMatch ? depositMatch[1].trim() : ""

    messages.push({
      id: `property-${messages.length + 1}`,
      timestamp: timestamp.trim(),
      sender: sender.trim(),
      propertyType,
      transactionType,
      bhkType,
      address,
      pinCode,
      carpetArea,
      price,
      priceNumeric,
      condition,
      floor,
      parking,
      contact,
      amenities,
      possession,
      deposit,
      rawMessage: text,
    })
  }

  return messages
}

function extractAddressAndPin(text: string): { address: string; pinCode: string } {
  // Extract pin code
  const pinMatch = text.match(/(\d{6})/g)
  const pinCode = pinMatch ? pinMatch[0] : ""

  // Extract address - look for location indicators
  const locationPatterns = [
    /(?:~|at|near|opp|location)\s+([^.\n]+?)(?:\s+\d{6}|project|rent|₹|carpet|available)/i,
    /(charai|thane|pachpakhadi|park woods|garden enclave|makhmali talao|hiranandani|ghodbunder)[^.\n]*?(?:\s+\d{6})?/i,
  ]

  let address = ""
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      address = match[1] || match[0]
      break
    }
  }

  // Clean up address
  address = address.replace(/\d{6}/, "").trim()

  return { address: address || "Address not specified", pinCode }
}

function extractPrice(text: string): { price: string; priceNumeric: number } {
  const pricePatterns = [
    /(?:rent|price)[:\s-]*₹?\s*([₹\d,.\s]+(?:lac|cr|k|lakh|crore)?)/i,
    /₹\s*([₹\d,.\s]+(?:lac|cr|k|lakh|crore)?)/i,
    /(\d+(?:,\d+)*)\s*(?:lac|cr|k|lakh|crore)/i,
  ]

  for (const pattern of pricePatterns) {
    const match = text.match(pattern)
    if (match) {
      const priceStr = match[1].trim()
      const priceNumeric = convertPriceToNumber(priceStr)
      return { price: priceStr, priceNumeric }
    }
  }

  return { price: "Price on request", priceNumeric: 0 }
}

function convertPriceToNumber(priceStr: string): number {
  const cleanPrice = priceStr.replace(/[₹,\s]/g, "")
  const numMatch = cleanPrice.match(/(\d+(?:\.\d+)?)/)

  if (!numMatch) return 0

  const num = Number.parseFloat(numMatch[1])

  if (/cr|crore/i.test(priceStr)) return num * 10000000
  if (/lac|lakh/i.test(priceStr)) return num * 100000
  if (/k/i.test(priceStr)) return num * 1000

  return num
}

function extractAmenities(text: string): string[] {
  const amenityKeywords = [
    "gym",
    "pool",
    "garden",
    "parking",
    "lift",
    "security",
    "playground",
    "clubhouse",
    "swimming pool",
    "balcony",
    "washroom",
    "kitchen",
  ]

  const found: string[] = []
  amenityKeywords.forEach((amenity) => {
    if (new RegExp(amenity, "i").test(text)) {
      found.push(amenity.charAt(0).toUpperCase() + amenity.slice(1))
    }
  })

  return found
}

// Mobile Property Card Component
function PropertyCard({ item, index }: { item: PropertyData; index: number }): ReactElement {
  return (
    <Card className="mb-4 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in slide-in-from-bottom-4 dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs transition-colors duration-200 ${
                item.propertyType === "Residential"
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  : item.propertyType === "Commercial"
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
              }`}
            >
              {item.propertyType}
            </Badge>
            <Badge
              variant={item.transactionType === "Rent" ? "default" : "secondary"}
              className={`text-xs transition-colors duration-200 ${
                item.transactionType === "Rent"
                  ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                  : "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
              }`}
            >
              {item.transactionType}
            </Badge>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.id}</span>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">{item.bhkType}</h3>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{item.address}</span>
              {item.pinCode && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{item.pinCode}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Area</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{item.carpetArea || "N/A"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</span>
              <div className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.price}</p>
              </div>
            </div>
          </div>

          {(item.condition || item.floor) && (
            <div className="grid grid-cols-2 gap-4">
              {item.condition && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Condition</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{item.condition}</p>
                </div>
              )}
              {item.floor && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Floor</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{item.floor}</p>
                </div>
              )}
            </div>
          )}

          {(item.amenities.length > 0 || item.parking) && (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                Features
              </span>
              <div className="flex flex-wrap gap-1">
                {item.parking && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  >
                    Parking
                  </Badge>
                )}
                {item.amenities.slice(0, 3).map((amenity, i) => (
                  <Badge key={i} variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                    {amenity}
                  </Badge>
                ))}
                {item.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                    +{item.amenities.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {item.contact.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                Contact
              </span>
              <div className="space-y-1">
                {item.contact.slice(0, 2).map((contact, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{contact}</span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-transparent">
                      Call
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              {item.timestamp.split(",")[0]}
            </div>
            <Button size="sm" variant="default" className="h-7 px-3 text-xs">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WhatsAppExcelTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all")
  const [pinCodeFilter, setPinCodeFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const { theme, setTheme } = useTheme()

  const data = useMemo(() => parseWhatsAppData(sampleWhatsAppData), [])

  const uniquePinCodes = useMemo(() => {
    const pins = [...new Set(data.map((item) => item.pinCode).filter(Boolean))]
    return pins.sort()
  }, [data])

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const matchesSearch =
        item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bhkType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contact.some((c) => c.includes(searchTerm))

      const matchesPropertyType = propertyTypeFilter === "all" || item.propertyType === propertyTypeFilter
      const matchesTransactionType = transactionTypeFilter === "all" || item.transactionType === transactionTypeFilter
      const matchesPinCode = pinCodeFilter === "all" || item.pinCode === pinCodeFilter

      return matchesSearch && matchesPropertyType && matchesTransactionType && matchesPinCode
    })

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === "priceNumeric") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [data, searchTerm, propertyTypeFilter, transactionTypeFilter, pinCodeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const SortableHeader = ({ field, children }: { field: SortField; children: ReactElement }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none border-r border-gray-200 dark:border-gray-700 transition-colors duration-200"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-gray-400 transition-transform duration-200" />
      </div>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading WhatsApp data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-2 sm:p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <Card className="shadow-sm border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="animate-in slide-in-from-left-4 duration-500">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-gray-900 dark:text-gray-100">
                  <Building className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  WhatsApp Real Estate Data
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Parsed from Twilio • {filteredAndSortedData.length} properties found
                </p>
              </div>
              <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Mobile Filter Toggle */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="w-full justify-between transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters & Search
            </div>
            {isMobileFiltersOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Filters */}
        <Card
          className={`shadow-sm transition-all duration-300 ${isMobileFiltersOpen || "hidden sm:block"} bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm`}
        >
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative animate-in slide-in-from-bottom-2 duration-300">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 transition-colors duration-200" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className="h-9 transition-all duration-200 hover:border-blue-300 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                </SelectContent>
              </Select>

              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger className="h-9 transition-all duration-200 hover:border-blue-300 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Transaction" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="Rent">For Rent</SelectItem>
                  <SelectItem value="Sale">For Sale</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pinCodeFilter} onValueChange={setPinCodeFilter}>
                <SelectTrigger className="h-9 transition-all duration-200 hover:border-blue-300 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Pin Code" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">All Pin Codes</SelectItem>
                  {uniquePinCodes.map((pin) => (
                    <SelectItem key={pin} value={pin}>
                      {pin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 animate-in fade-in duration-500">
                <Filter className="h-4 w-4" />
                {filteredAndSortedData.length} of {data.length} properties
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile View - Cards */}
        <div className="sm:hidden space-y-4">
          {filteredAndSortedData.map((item, index) => (
            <PropertyCard key={item.id} item={item} index={index} />
          ))}
        </div>

        {/* Desktop View - Table */}
        <Card className="shadow-sm hidden sm:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-300">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                  <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                    <SortableHeader field="id">ID</SortableHeader>
                    <SortableHeader field="timestamp">Date/Time</SortableHeader>
                    <SortableHeader field="propertyType">Type</SortableHeader>
                    <SortableHeader field="transactionType">Transaction</SortableHeader>
                    <SortableHeader field="bhkType">BHK/Config</SortableHeader>
                    <SortableHeader field="address">Address</SortableHeader>
                    <SortableHeader field="pinCode">Pin Code</SortableHeader>
                    <SortableHeader field="carpetArea">Area</SortableHeader>
                    <SortableHeader field="priceNumeric">Price</SortableHeader>
                    <SortableHeader field="condition">Condition</SortableHeader>
                    <SortableHeader field="floor">Floor</SortableHeader>
                    <TableHead className="border-r border-gray-200 dark:border-gray-700">Features</TableHead>
                    <SortableHeader field="contact">Contact</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                        index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-800/50"
                      } border-b border-gray-100 dark:border-gray-700 animate-in slide-in-from-bottom-2`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="border-r border-gray-200 dark:border-gray-700 font-mono text-xs">
                        {item.id}
                      </TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {item.timestamp.split(",")[0]}
                        </div>
                      </TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">
                        <Badge
                          variant="outline"
                          className={`text-xs transition-all duration-200 hover:scale-105 dark:border-gray-600 dark:text-gray-300`}
                        >
                          {item.propertyType}
                        </Badge>
                      </TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">
                        <Badge
                          variant={item.transactionType === "Rent" ? "default" : "secondary"}
                          className={`text-xs transition-all duration-200 hover:scale-105 dark:border-gray-600 dark:text-gray-300`}
                        >
                          {item.transactionType}
                        </Badge>
                      </TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.bhkType}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.address}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.pinCode}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.carpetArea}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.price}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.condition}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">{item.floor}</TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {item.parking && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            >
                              Parking
                            </Badge>
                          )}
                          {item.amenities.slice(0, 3).map((amenity, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs dark:border-gray-600 dark:text-gray-300"
                            >
                              {amenity}
                            </Badge>
                          ))}
                          {item.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                              +{item.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="border-r border-gray-200 dark:border-gray-700">
                        <div className="space-y-1">
                          {item.contact.slice(0, 2).map((contact, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-mono">{contact}</span>
                            </div>
                          ))}
                          {item.contact.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{item.contact.length - 2} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredAndSortedData.length === 0 && (
              <div className="text-center py-12 animate-in fade-in duration-500">
                <div className="text-gray-400 mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No properties found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              value: filteredAndSortedData.filter((item) => item.transactionType === "Rent").length,
              label: "For Rent",
              color: "text-blue-600 dark:text-blue-400",
              icon: Home,
            },
            {
              value: filteredAndSortedData.filter((item) => item.transactionType === "Sale").length,
              label: "For Sale",
              color: "text-green-600 dark:text-green-400",
              icon: TrendingUp,
            },
            {
              value: filteredAndSortedData.filter((item) => item.propertyType === "Residential").length,
              label: "Residential",
              color: "text-purple-600 dark:text-purple-400",
              icon: Home,
            },
            {
              value: uniquePinCodes.length,
              label: "Pin Codes",
              color: "text-orange-600 dark:text-orange-400",
              icon: MapPin,
            },
          ].map((stat, index) => (
            <Card
              key={stat.label}
              className="shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-4 sm:pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {React.createElement(stat.icon, { className: `h-5 w-5 sm:h-6 sm:w-6 ${stat.color}` })}
                  </div>
                  <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
