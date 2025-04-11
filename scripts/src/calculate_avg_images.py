#!/usr/bin/env python3
import json
import os
import statistics
import argparse

def calculate_average_images(input_file=None):
    # Path to the apartments JSON file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Use the provided input file or default to apartments_sample.json
    if input_file is None:
        input_file = os.path.join(script_dir, "apartments_sample.json")
    elif not os.path.isabs(input_file):
        input_file = os.path.join(script_dir, input_file)
    
    # Read the JSON data
    with open(input_file, 'r') as file:
        apartments = json.load(file)
    
    # Count the number of images for each apartment
    image_counts = []
    for apartment in apartments:
        image_count = len(apartment.get("photos", []))
        image_counts.append(image_count)
        print(f"Apartment ID: {apartment.get('id', 'N/A')}, Image Count: {image_count}")
    
    # Calculate statistics
    total_apartments = len(apartments)
    total_images = sum(image_counts)
    average_images = total_images / total_apartments if total_apartments > 0 else 0
    median_images = statistics.median(image_counts) if image_counts else 0
    max_images = max(image_counts) if image_counts else 0
    
    # Calculate percentiles
    if image_counts:
        # Sort the image counts for percentile calculation
        sorted_counts = sorted(image_counts)
        p60 = statistics.quantiles(sorted_counts, n=10)[5]  # 60th percentile
        p70 = statistics.quantiles(sorted_counts, n=10)[6]  # 70th percentile
        p80 = statistics.quantiles(sorted_counts, n=10)[7]  # 80th percentile
        p90 = statistics.quantiles(sorted_counts, n=10)[8]  # 90th percentile
    else:
        p60 = p70 = p80 = p90 = 0
    
    # Print the results
    print("\nSummary Statistics:")
    print(f"Total apartments: {total_apartments}")
    print(f"Total images: {total_images}")
    print(f"Average images per apartment: {average_images:.2f}")
    print(f"Median images per apartment: {median_images}")
    print(f"Maximum images for an apartment: {max_images}")
    print("\nPercentiles:")
    print(f"60th percentile: {p60}")
    print(f"70th percentile: {p70}")
    print(f"80th percentile: {p80}")
    print(f"90th percentile: {p90}")
    
    return average_images

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Calculate average number of images per apartment')
    parser.add_argument('--input', '-i', help='Path to the apartments JSON file (default: apartments_sample.json)')
    args = parser.parse_args()
    
    calculate_average_images(args.input) 